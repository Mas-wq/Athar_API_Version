import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  MapPin,
  Calendar,
  Upload,
  FileText,
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Info,
  CheckCircle2,
  Cpu,
  Fingerprint,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";
import { uploadLocalImages } from "../lib/localImageUpload.js";
import { PageShell } from "../components/layout";
import { AccessCard } from "../components/ui";

const AddLostItemReportPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    item_type: "",
    date_lost: "",
    location_lost: "",
  });

  const [proofFields, setProofFields] = useState([
    { key: "Brand", value: "" },
    { key: "Color", value: "" },
  ]);
  const [previewImages, setPreviewImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Guard Clause
  if (!isAuthenticated || user?.role !== "USER") {
    return (
      <AccessCard
        icon={Fingerprint}
        title="Identity Required"
        description="Please authenticate as a standard USER to register a lost asset."
      />
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
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
      toast.error("Telemetry limit exceeded (5MB per image)");
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setPreviewImages((prev) => [...prev, reader.result]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_type || !formData.date_lost || !formData.location_lost) {
      toast.error("Primary parameters missing");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = await uploadImagesLocally();
      const report_details = {};
      proofFields.forEach((f) => {
        if (f.key && f.value) report_details[f.key] = f.value;
      });

      const response = await api.post("/user/lost-reports", {
        ...formData,
        date_lost: new Date(formData.date_lost).toISOString(),
        report_details,
        image_urls: imageUrls,
      });

      toast.success("Report saved. Athar AI is checking found items in the background and will show any match in Athar AI chat.");
      navigate("/my-dashboard");
    } catch (error) {
      toast.error("Registry failed");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                Register <span className="text-emerald-500">Lost Asset.</span>
              </h1>
              <p className="text-slate-400 font-medium">
                Initiate a global search protocol for your missing item.
              </p>
            </header>

            <form
              id="lost-report-form"
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
                    placeholder="e.g. MacBook Pro M3 Silver"
                    icon={Package}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="Last Known Location"
                      name="location_lost"
                      value={formData.location_lost}
                      onChange={handleChange}
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
                          placeholder="dd/mm/yyyy"
                          className="w-full bg-slate-950 border border-slate-800 ps-14 pe-6 py-4 rounded-2xl text-white font-bold transition-all focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 [color-scheme:dark]"
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
                    onClick={() =>
                      setProofFields([...proofFields, { key: "", value: "" }])
                    }
                    className="text-[9px] font-semibold text-emerald-500 flex items-center gap-2 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus size={12} /> Add Attribute
                  </button>
                </div>
                <div className="p-8 space-y-4">
                  {proofFields.map((field, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <input
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-400 focus:border-emerald-500 focus:outline-none transition-all"
                        placeholder="Attribute (e.g. Serial)"
                        value={field.key}
                        onChange={(e) =>
                          updateProofField(idx, "key", e.target.value)
                        }
                      />
                      <input
                        className="flex-[2] bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none transition-all"
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) =>
                          updateProofField(idx, "value", e.target.value)
                        }
                      />
                      {proofFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setProofFields(
                              proofFields.filter((_, i) => i !== idx),
                            )
                          }
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

              {previewImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {previewImages.map((src, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-800"
                    >
                      <img
                        src={src}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-slate-800">
                <button
                  type="submit"
                  form="lost-report-form"
                  disabled={isSubmitting || uploadingImages}
                  className="w-full py-4 bg-emerald-500 text-slate-950 text-[11px] font-semibold rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-3"
                >
                  {isSubmitting || uploadingImages ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={16} /> Broadcast Report
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full py-4 bg-slate-900 text-slate-400 text-[11px] font-semibold rounded-2xl hover:text-white transition-all"
                >
                  Abort Process
                </button>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-1" />
                  <p className="text-[9px] font-bold text-slate-400 leading-relaxed">
                    Reports with specific attributes (Serial #, scratches) are
                    matched 4x faster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

// --- Helper Component ---
const FormInput = ({ label, icon: Icon, type = "text", ...props }) => (
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
        {...props}
        className="w-full bg-slate-950 border border-slate-800 ps-14 pe-6 py-4 rounded-2xl text-white font-bold transition-all focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 [color-scheme:dark]"
      />
    </div>
  </div>
);

export default AddLostItemReportPage;
