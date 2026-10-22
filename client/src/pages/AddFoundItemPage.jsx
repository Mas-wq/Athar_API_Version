import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  MapPin,
  Calendar,
  Upload,
  FileText,
  ArrowLeft,
  Loader,
  Save,
  Plus,
  Trash2,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  ShieldAlert,
  Info,
  CheckCircle2,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";
import { uploadLocalImages } from "../lib/localImageUpload.js";
import { PageShell } from "../components/layout";
import { AccessCard } from "../components/ui";

const AddFoundItem = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    item_type: "",
    date_found: "",
    location_found: "",
    image_urls: [],
  });

  const [detailFields, setDetailFields] = useState([
    { key: "", value: "", isPublic: true },
  ]);

  const [previewImages, setPreviewImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // --- Logic ---

  if (!isAuthenticated) {
    return (
        <AccessCard
          icon={User}
          title="Authentication required"
          description="Sign in to share a found item with the Athar community."
        />
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const addDetailField = () => {
    setDetailFields([{ key: "", value: "", isPublic: true }, ...detailFields]);
  };

  const removeDetailField = (index) => {
    if (detailFields.length > 1) {
      const updated = detailFields.filter((_, i) => i !== index);
      setDetailFields(updated);
    }
  };

  const updateDetailField = (index, field, value) => {
    const updated = [...detailFields];
    updated[index][field] = value;
    setDetailFields(updated);
  };

  const togglePublic = (index) => {
    const updated = [...detailFields];
    updated[index].isPublic = !updated[index].isPublic;
    setDetailFields(updated);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setErrors((prev) => ({
        ...prev,
        images: `${oversizedFiles.length} file(s) exceed 5MB limit`,
      }));
      return;
    }

    const newPreviews = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        if (newPreviews.length === files.length) {
          setPreviewImages((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles((prev) => [...prev, ...files]);
    if (errors.images) setErrors((prev) => ({ ...prev, images: "" }));
  };

  const removePreviewImage = (index) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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
    if (!formData.item_type.trim())
      newErrors.item_type = "Item type is required";
    if (!formData.date_found) newErrors.date_found = "Date found is required";
    if (!formData.location_found.trim())
      newErrors.location_found = "Location is required";
    const hasValidFields = detailFields.some(
      (field) => field.key.trim() && field.value.trim()
    );
    const hasPrivateField = detailFields.some(
      (field) => !field.isPublic && field.key.trim() && field.value.trim()
    );
    if (!hasValidFields) {
      newErrors.details = "At least one detail attribute is required";
    } else if (!hasPrivateField) {
      newErrors.details = "Add at least one hidden detail so AI can compare claim proof safely";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("You must be logged in");
      navigate("/login");
      return;
    }
    if (!validateForm()) {
      toast.error("Please check the form for errors");
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrls = [];
      if (selectedFiles.length > 0) {
        imageUrls = await uploadImagesLocally();
      }
      const hidden_details = {};
      const public_details = {};
      detailFields.forEach((field) => {
        if (field.key.trim() && field.value.trim()) {
          if (field.isPublic)
            public_details[field.key.trim()] = field.value.trim();
          else hidden_details[field.key.trim()] = field.value.trim();
        }
      });
      const payload = {
        item_type: formData.item_type.trim(),
        date_found: new Date(formData.date_found).toISOString(),
        location_found: formData.location_found.trim(),
        hidden_details,
        public_details,
        image_urls: imageUrls,
      };
      const response = await api.post("/user/found-items", payload);
      if (response.status === 201 || response.status === 200) {
        toast.success("Item posted. Athar AI is checking for matches in the background; owners will see any match in Athar AI chat.");
        setTimeout(() => navigate("/found-items"), 1500);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to add item.");
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
          />
          System Portal
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Form Content */}
          <div className="lg:col-span-8 space-y-8">
            <header>
              <h1 className="text-4xl font-semibold text-white tracking-tight mb-2">
                Register <span className="text-emerald-500">Found Item.</span>
              </h1>
              <p className="text-slate-400 font-medium">
                Add a new item to the registry for owners to claim.
              </p>
            </header>

            <form
              id="add-item-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Card 1: Core Details */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/30 flex items-center gap-3">
                  <FileText size={16} className="text-emerald-500" />
                  <span className="text-[11px] font-semibold text-slate-400">
                    Core Details
                  </span>
                </div>
                <div className="p-8 space-y-6">
                  <FormInput
                    label="Item Type / Name"
                    name="item_type"
                    value={formData.item_type}
                    onChange={handleChange}
                    placeholder="e.g. Black Sony Wireless Headphones"
                    icon={Package}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="Location Found"
                      name="location_found"
                      value={formData.location_found}
                      onChange={handleChange}
                      placeholder="e.g. Library, 2nd Floor"
                      icon={MapPin}
                    />
                    <div className="space-y-3">
                      <label className="text-[11px] font-semibold text-slate-500 ms-1">
                        Date & Time Found
                      </label>
                      <div className="relative">
                        <div className="absolute start-5 top-1/2 -translate-y-1/2 text-emerald-500/50">
                          <Calendar size={18} />
                        </div>
                        <input
                          type="datetime-local"
                          name="date_found"
                          value={formData.date_found}
                          onChange={handleChange}
                          max={new Date().toISOString().slice(0, 16)}
                          placeholder="dd/mm/yyyy"
                          className="w-full bg-slate-950 border border-slate-800 ps-14 pe-6 py-4 rounded-2xl text-white font-bold transition-all focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Item Attributes */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info size={16} className="text-emerald-500" />
                    <span className="text-[11px] font-semibold text-slate-400">
                      Item Attributes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addDetailField}
                    className="text-[9px] font-semibold text-emerald-500 flex items-center gap-2 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus size={12} /> Add Attribute
                  </button>
                </div>
                <div className="p-8 space-y-4">
                  {detailFields.map((field, index) => (
                    <div key={index} className="flex gap-3 group items-start">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) =>
                          updateDetailField(index, "key", e.target.value)
                        }
                        placeholder="Attribute (e.g. Serial)"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-400 focus:border-emerald-500 focus:outline-none transition-all"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) =>
                          updateDetailField(index, "value", e.target.value)
                        }
                        placeholder="Value"
                        className="flex-[2] bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => togglePublic(index)}
                        className={`p-3 rounded-xl border transition-all ${
                          field.isPublic
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : "bg-slate-800 border-slate-700 text-slate-500"
                        }`}
                        title={field.isPublic ? "Public" : "Hidden"}
                      >
                        {field.isPublic ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </button>
                      {detailFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDetailField(index)}
                          className="p-3 text-slate-600 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {errors.details && (
                    <div className="flex items-center gap-2 text-xs text-red-400 mt-2">
                      <AlertCircle size={14} />
                      {errors.details}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Right: Media & Actions Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 space-y-6 lg:sticky lg:top-10">
              <h3 className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                <Upload size={14} className="text-emerald-500" />
                Evidence Photos
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
                  <p className="text-[9px] text-slate-600 mt-2">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              </div>

              {errors.images && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle size={14} />
                  {errors.images}
                </div>
              )}

              {previewImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {previewImages.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 group"
                    >
                      <img
                        src={src}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removePreviewImage(i)}
                          className="text-white hover:text-red-400 p-2 bg-slate-900/80 rounded-lg transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-slate-800">
                <button
                  type="submit"
                  form="add-item-form"
                  disabled={isSubmitting || uploadingImages}
                  className="w-full py-4 bg-emerald-500 text-slate-950 text-[11px] font-semibold rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || uploadingImages ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={16} /> Save Record
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full py-4 bg-slate-900 text-slate-400 text-[11px] font-semibold rounded-2xl hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                <div className="flex gap-3 items-start">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-1" />
                  <p className="text-[9px] font-bold text-slate-400 leading-relaxed">
                    Use "Hidden" attributes for security questions (e.g., serial
                    numbers). Clear photos increase claim verification speed by
                    40%.
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

export default AddFoundItem;
