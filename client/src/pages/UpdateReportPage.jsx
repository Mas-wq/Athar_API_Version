import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Package,
  MapPin,
  Calendar,
  Upload,
  ArrowLeft,
  Loader,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Info,
  Cpu,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";
import { uploadLocalImages } from "../lib/localImageUpload.js";
import { PageShell } from "../components/layout";
import { AccessCard, LoadingState } from "../components/ui";

const UpdateReportPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    item_type: "",
    date_lost: "",
    location_lost: "",
    status: "OPEN",
  });

  const [proofFields, setProofFields] = useState([{ key: "", value: "" }]);
  const [previewImages, setPreviewImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Helper to format ISO date for datetime-local input
  const formatForInput = (iso) => {
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated || user?.role !== "USER") {
      setLoadError("Sign in as the report owner to edit this lost report.");
      setIsLoading(false);
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const res = await api.get(`/user/lost-reports/${id}`);
        const report = res.data.lostReport;
        if (!report) throw new Error("Report not found");

        setFormData({
          item_type: report.item_type || "",
          date_lost: report.date_lost ? formatForInput(report.date_lost) : "",
          location_lost: report.location_lost || "",
          status: report.status || "OPEN",
        });

        setExistingImages(
          Array.isArray(report.image_urls) ? report.image_urls : []
        );

        const details = report.report_details || {};
        const fields = Object.entries(details).map(([key, value]) => ({
          key,
          value: String(value),
        }));
        setProofFields(fields.length > 0 ? fields : [{ key: "", value: "" }]);
      } catch (error) {
        const message =
          error.response?.data?.message ||
          "Could not load this report. It may have been removed or may no longer be editable.";
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [id, isAuthLoading, isAuthenticated, user?.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const addProofField = () =>
    setProofFields([{ key: "", value: "" }, ...proofFields]);

  const removeProofField = (index) => {
    if (proofFields.length > 1) {
      setProofFields(proofFields.filter((_, i) => i !== index));
    }
  };

  const updateProofField = (index, field, value) => {
    const updated = [...proofFields];
    updated[index][field] = value;
    setProofFields(updated);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);

    if (oversizedFiles.length > 0) {
      setErrors((prev) => ({ ...prev, images: "Some files exceed 5MB limit" }));
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImages((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const uploadImagesLocally = async () => {
    if (selectedFiles.length === 0) return [];
    setUploadingImages(true);
    try {
      return await uploadLocalImages(selectedFiles);
    } finally {
      setUploadingImages(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.item_type.trim()) newErrors.item_type = "Required";
    if (!formData.date_lost) newErrors.date_lost = "Required";
    if (!formData.location_lost.trim()) newErrors.location_lost = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.status !== "OPEN") return toast.error("Report is locked");
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const newUrls = await uploadImagesLocally();
      const report_details = {};
      proofFields.forEach((f) => {
        if (f.key && f.value) report_details[f.key] = f.value;
      });

      const payload = {
        ...formData,
        date_lost: new Date(formData.date_lost).toISOString(),
        report_details,
        image_urls: [...existingImages, ...newUrls],
      };

      await api.patch(`/user/lost-reports/${id}`, payload);
      toast.success("Updated successfully");
      navigate("/my-dashboard");
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoading)
    return (
        <LoadingState />
    );

  if (!isAuthenticated || user?.role !== "USER") {
    return (
      <AccessCard
        icon={AlertCircle}
        title="Sign in required"
        description="Log in with the account that created this lost report to edit it."
        actionLabel="Go to Login"
        actionTo="/login"
      />
    );
  }

  if (loadError) {
    return (
      <PageShell>
        <div className="max-w-3xl mx-auto pt-20">
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="mt-1 text-rose-400" size={22} />
              <div>
                <h1 className="text-xl font-semibold text-white">Could not open this report</h1>
                <p className="mt-2 text-sm text-slate-300">{loadError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/my-dashboard")}
              className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-semibold text-white hover:border-emerald-500"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const disabled = formData.status !== "OPEN";

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto pt-15">
        {/* Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-[11px] font-semibold text-slate-500 hover:text-emerald-400 transition-all mb-10"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-1 transition-transform"
          />{" "}
          System Portal
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Form Content */}
          <div className="lg:col-span-8 space-y-8">
            <header>
              <h1 className="text-4xl font-semibold text-white tracking-tight mb-2">
                Update <span className="text-emerald-500">Lost Report.</span>
              </h1>
              <p className="text-slate-400 font-medium">
                Refine details for better matching accuracy.
              </p>
            </header>

            {disabled && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex items-start gap-4">
                <AlertCircle
                  size={20}
                  className="text-amber-400 mt-1 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-400">
                    Report Locked
                  </p>
                  <p className="text-sm text-slate-300 mt-1">
                    Matched reports cannot be changed.
                  </p>
                </div>
              </div>
            )}

            <form
              id="update-report-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Card 1: Primary Parameters */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/30 flex items-center gap-3">
                  <Cpu size={16} className="text-emerald-500" />
                  <span className="text-[11px] font-semibold text-slate-400">
                    Primary Parameters
                  </span>
                </div>
                <div className="p-8 space-y-6">
                  <FormInput
                    label="Item Type"
                    name="item_type"
                    value={formData.item_type}
                    onChange={handleChange}
                    disabled={disabled}
                    placeholder="e.g. MacBook Pro M3 Silver"
                    icon={Package}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="Last Known Location"
                      name="location_lost"
                      value={formData.location_lost}
                      onChange={handleChange}
                      disabled={disabled}
                      placeholder="e.g. Terminal 3, Cafe"
                      icon={MapPin}
                    />
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 ms-1">
                          Temporal Marker (Date/Time)
                        </label>
                      </div>
                      <div className="relative">
                        <div className="absolute start-5 top-1/2 -translate-y-1/2 text-emerald-500/50">
                          <Calendar size={18} />
                        </div>
                        <input
                          type="datetime-local"
                          name="date_lost"
                          value={formData.date_lost}
                          onChange={handleChange}
                          disabled={disabled}
                          placeholder="dd/mm/yyyy"
                          className="w-full bg-slate-950 border border-slate-800 ps-14 pe-6 py-4 rounded-2xl text-white font-bold transition-all focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 disabled:opacity-50 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Distinct Attributes */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info size={16} className="text-emerald-500" />
                    <span className="text-[11px] font-semibold text-slate-400">
                      Distinct Attributes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addProofField}
                    disabled={disabled}
                    className="text-[9px] font-semibold text-emerald-500 flex items-center gap-2 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    <Plus size={12} /> Add Attribute
                  </button>
                </div>
                <div className="p-8 space-y-4">
                  {proofFields.map((field, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <input
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-400 focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-50"
                        placeholder="Attribute (e.g. Serial)"
                        value={field.key}
                        disabled={disabled}
                        onChange={(e) =>
                          updateProofField(idx, "key", e.target.value)
                        }
                      />
                      <input
                        className="flex-[2] bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-50"
                        placeholder="Value"
                        value={field.value}
                        disabled={disabled}
                        onChange={(e) =>
                          updateProofField(idx, "value", e.target.value)
                        }
                      />
                      {proofFields.length > 1 && !disabled && (
                        <button
                          type="button"
                          onClick={() => removeProofField(idx)}
                          className="p-3 text-slate-600 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Right: Media & Actions Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 space-y-6 lg:sticky lg:top-10">
              <h3 className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                <Upload size={14} className="text-emerald-500" /> Visual
                Verification
              </h3>

              <div className="relative group">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={disabled}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-slate-800 bg-slate-950 rounded-3xl p-8 text-center group-hover:border-emerald-500/50 transition-all">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500">
                    <Upload size={20} />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Drop Reference Media
                  </p>
                </div>
              </div>

              {/* Image Previews */}
              <div className="space-y-3">
                {existingImages.length > 0 && (
                  <div>
                    <p className="text-[9px] font-semibold text-slate-600 mb-3">
                      Existing Images
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {existingImages.map((img, i) => (
                        <div
                          key={i}
                          className="relative aspect-square rounded-xl overflow-hidden border border-slate-700"
                        >
                          <img
                            src={img}
                            alt="Existing"
                            className="w-full h-full object-cover"
                          />
                          {!disabled && (
                            <button
                              onClick={() =>
                                setExistingImages(
                                  existingImages.filter((_, idx) => idx !== i)
                                )
                              }
                              className="absolute top-1 end-1 bg-rose-500 p-1 rounded text-white hover:bg-rose-600"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewImages.length > 0 && (
                  <div>
                    <p className="text-[9px] font-semibold text-emerald-600 mb-3">
                      New Images
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {previewImages.map((img, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-xl overflow-hidden border border-emerald-500"
                        >
                          <img
                            src={img}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  form="update-report-form"
                  disabled={disabled || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-slate-950 text-xs font-semibold rounded-2xl hover:bg-emerald-400 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? (
                    <Loader className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full px-6 py-3 bg-slate-900 text-slate-300 text-xs font-semibold rounded-2xl hover:text-white transition-all border border-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

// FormInput Component
const FormInput = ({
  label,
  icon: Icon,
  type = "text",
  disabled,
  ...props
}) => (
  <div className="space-y-3">
    <label className="text-[11px] font-semibold text-slate-500 ms-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute start-5 top-1/2 -translate-y-1/2 text-emerald-500/50">
        <Icon size={18} />
      </div>
      <input
        type={type}
        disabled={disabled}
        {...props}
        className="w-full bg-slate-950 border border-slate-800 ps-14 pe-6 py-4 rounded-2xl text-white font-bold transition-all focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 disabled:opacity-50 [color-scheme:dark]"
      />
    </div>
  </div>
);

export default UpdateReportPage;
