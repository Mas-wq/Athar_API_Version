import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";
import { uploadLocalImages } from "../lib/localImageUpload.js";
import {
  Upload,
  AlertCircle,
  Save,
  ArrowLeft,
  CheckCircle2,
  X,
  Loader,
  Sparkles,
  RotateCw,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { PageShell } from "../components/layout";
import { AccessCard } from "../components/ui";

const ClaimItemPage = () => {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState({});
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsLoadFailed, setReportsLoadFailed] = useState(false);
  const [lostReportId, setLostReportId] = useState(searchParams.get("reportId") || "");
  const [questionSessionId, setQuestionSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [questionRetryToken, setQuestionRetryToken] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setReportsLoading(false);
      return;
    }
    let active = true;
    setReportsLoading(true);
    api.get("/user/lost-reports")
      .then(({ data }) => {
        if (!active) return;
        const openReports = (data.lostReports || []).filter((report) => report.status === "OPEN");
        setReports(openReports);
        setReportsLoadFailed(false);
        setLostReportId((current) => openReports.some((report) => report.id === current)
          ? current
          : openReports.length === 1 ? openReports[0].id : "");
      })
      .catch(() => {
        if (!active) return;
        setReportsLoadFailed(true);
        toast.error("Could not load open lost reports");
      })
      .finally(() => { if (active) setReportsLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated]);

  const [previewImages, setPreviewImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    let active = true;
    setQuestionSessionId("");
    setQuestions([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuestionsError("");
    if (!isAuthenticated || !lostReportId || !itemId) {
      setIsGeneratingQuestions(false);
      return () => { active = false; };
    }

    setIsGeneratingQuestions(true);
    api.post(`/user/claims/${itemId}/questions`, { lost_report_id: lostReportId })
      .then(({ data }) => {
        if (!active) return;
        setQuestionSessionId(data.session_id || "");
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setCurrentQuestionIndex(0);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Claim ownership question request failed:", error);
        const serverMessage = error.response?.data?.message;
        const status = error.response?.status;
        if (serverMessage) {
          setQuestionsError(serverMessage);
        } else if (status === 404) {
          setQuestionsError("The claim-question endpoint was not found. Restart the backend server, then try again.");
        } else if (status) {
          setQuestionsError(`The backend could not prepare ownership questions (HTTP ${status}). Check the server logs, then try again.`);
        } else {
          setQuestionsError("Could not reach the backend to prepare ownership questions. Make sure the server is running, then try again.");
        }
      })
      .finally(() => { if (active) setIsGeneratingQuestions(false); });
    return () => { active = false; };
  }, [isAuthenticated, itemId, lostReportId, questionRetryToken]);

  if (!isAuthenticated) {
    return <AccessCard />;
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setErrors((prev) => ({ ...prev, images: `${oversizedFiles.length} file(s) exceed 5MB limit` }));
      return;
    }

    const newPreviews = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        if (newPreviews.length === files.length) setPreviewImages((prev) => [...prev, ...newPreviews]);
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
    if (!lostReportId) newErrors.report = "Choose the lost report this claim belongs to";
    if (!questionSessionId || questions.length === 0) newErrors.questions = "Wait for Athar AI to prepare the questions, then try again";
    else if (questions.some((question) => !String(answers[question.id] || "").trim())) {
      newErrors.questions = "Answer every ownership question";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please answer all ownership questions");
      return;
    }
    setIsSubmitting(true);
    try {
      const imageUrls = selectedFiles.length > 0 ? await uploadImagesLocally() : [];
      const payload = {
        lost_report_id: lostReportId,
        question_session_id: questionSessionId,
        answers: questions.map((question) => ({ question_id: question.id, answer: answers[question.id] })),
        image_urls: imageUrls,
      };
      const response = await api.post(`/user/claims/${itemId}`, payload);
      if (response.status === 201 || response.status === 200) {
        toast.success("Claim submitted. The finder can review your answers now.", {
          position: "top-center",
          autoClose: 2000,
        });
        const conversationId = response.data.claim?.conversation_id;
        setTimeout(() => navigate(conversationId ? `/chats/${conversationId}` : "/chats"), 700);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to submit claim");
      if (String(error.response?.data?.message || "").toLowerCase().includes("questions expired")) {
        setQuestionRetryToken((value) => value + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReports = reports.filter((report) => report.status === "OPEN");

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto pt-15">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-[11px] font-semibold text-slate-500 hover:text-emerald-400 transition-all mb-10"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          System Portal
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <header>
              <h1 className="text-4xl font-semibold text-white tracking-tight mb-2">
                Submit <span className="text-emerald-500">Claim.</span>
              </h1>
              <p className="text-slate-400 font-medium">
                Athar AI will ask about details in the found-item photo. Your answers help the finder review your claim.
              </p>
            </header>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-start gap-4">
              <Sparkles size={20} className="text-emerald-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">AI Ownership Questions</p>
                <p className="text-sm text-slate-300 mt-1">
                  Answer the questions based on what you remember about your item. Athar AI prepares the questions; the finder reviews your answers and makes the final decision.
                </p>
              </div>
            </div>

            <form id="claim-item-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <label htmlFor="lost-report" className="mb-2 block text-xs font-semibold text-slate-300">
                  Which of your lost reports is this claim for?
                </label>
                <select
                  id="lost-report"
                  value={lostReportId}
                  onChange={(event) => setLostReportId(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">{reportsLoading ? "Loading your open reports…" : openReports.length ? "Select one of your open lost reports" : "You have no open lost reports"}</option>
                  {openReports.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.report_number || `ATH-${report.id.slice(0, 8).toUpperCase()}`} · {report.item_type} · Open
                    </option>
                  ))}
                </select>
                {errors.report && <p className="mt-2 text-xs text-rose-400">{errors.report}</p>}
                {!reportsLoading && reportsLoadFailed && <p className="mt-2 text-xs text-rose-300">Your reports could not be loaded. Refresh the page and try again.</p>}
                {!reportsLoading && !reportsLoadFailed && openReports.length === 0 && <p className="mt-2 text-xs text-amber-300">Create a lost report first, then return here to submit a claim.</p>}
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MessageCircle size={16} className="text-emerald-500" />
                    <span className="text-[11px] font-semibold text-slate-300">Athar AI · Ownership check</span>
                  </div>
                  {questions.length > 0 && <span className="text-[11px] font-bold text-slate-500">{Math.min(currentQuestionIndex + 1, questions.length)} / {questions.length}</span>}
                </div>
                <div className="p-8 space-y-5">
                  {!lostReportId && <p className="text-sm text-slate-400">Choose your lost report to start a short conversation with Athar AI about the found item.</p>}
                  {isGeneratingQuestions && (
                    <div className="flex items-center gap-3 text-sm text-slate-300 py-5">
                      <Loader className="animate-spin text-emerald-400" size={18} />
                      Athar AI is checking the found-item photo and getting your first question ready…
                    </div>
                  )}
                  {!isGeneratingQuestions && questionsError && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                      <p className="text-sm text-rose-300">{questionsError}</p>
                      <button
                        type="button"
                        onClick={() => setQuestionRetryToken((value) => value + 1)}
                        className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                      >
                        <RotateCw size={13} /> Try again
                      </button>
                    </div>
                  )}
                  {!isGeneratingQuestions && questions.length > 0 && (
                    <div className="space-y-5" aria-live="polite">
                      {questions.slice(0, currentQuestionIndex).map((question, index) => (
                        <div key={question.id} className="space-y-3">
                          <div className="max-w-[90%] rounded-2xl rounded-ss-sm border border-slate-800 bg-slate-900 px-4 py-3">
                            <p className="mb-1 text-[11px] font-semibold text-emerald-400">Athar AI · {index + 1}</p>
                            <p className="text-sm text-slate-200">{question.question}</p>
                          </div>
                          <div className="ms-auto max-w-[90%] rounded-2xl rounded-se-sm bg-emerald-500/10 px-4 py-3">
                            <p className="mb-1 text-[11px] font-semibold text-emerald-400">Your answer</p>
                            <p className="whitespace-pre-wrap text-sm text-slate-200">{answers[question.id]}</p>
                            <button type="button" onClick={() => setCurrentQuestionIndex(index)} className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300">Edit answer</button>
                          </div>
                        </div>
                      ))}

                      {currentQuestionIndex < questions.length ? (
                        <div className="space-y-4">
                          <div className="max-w-[90%] rounded-2xl rounded-ss-sm border border-slate-800 bg-slate-900 px-4 py-3">
                            <p className="mb-1 text-[11px] font-semibold text-emerald-400">Athar AI · Question {currentQuestionIndex + 1}</p>
                            <p className="text-sm leading-6 text-slate-100">{questions[currentQuestionIndex].question}</p>
                          </div>
                          <label htmlFor={`ownership-answer-${questions[currentQuestionIndex].id}`} className="sr-only">Your answer</label>
                          <textarea
                            id={`ownership-answer-${questions[currentQuestionIndex].id}`}
                            value={answers[questions[currentQuestionIndex].id] || ""}
                            onChange={(event) => setAnswers((current) => ({ ...current, [questions[currentQuestionIndex].id]: event.target.value }))}
                            maxLength={1000}
                            rows={3}
                            placeholder="Type your answer…"
                            className="w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500"
                          />
                          <div className="flex items-center justify-between gap-3">
                            <button type="button" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))} className="text-xs font-bold text-slate-400 hover:text-white disabled:invisible">Previous question</button>
                            <button
                              type="button"
                              disabled={!String(answers[questions[currentQuestionIndex].id] || "").trim()}
                              onClick={() => setCurrentQuestionIndex((index) => index + 1)}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {currentQuestionIndex === questions.length - 1 ? "Review answers" : "Next question"}<ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                          <p className="text-sm font-bold text-emerald-300">You’ve answered all the questions.</p>
                          <p className="mt-1 text-xs text-slate-400">Review your answers above, then submit your claim when you’re ready.</p>
                        </div>
                      )}
                    </div>
                  )}
                  {errors.questions && <p className="flex items-center gap-2 text-xs text-rose-400"><AlertCircle size={14} />{errors.questions}</p>}
                  {questions.length > 0 && <p className="text-xs text-slate-500">Your answers are saved with the claim for the finder to review. The AI score is a guide, not proof of ownership.</p>}
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 space-y-6 lg:sticky lg:top-10">
              <h3 className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                <Upload size={14} className="text-emerald-500" /> Evidence Photos
              </h3>

              <div className="relative group">
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="border-2 border-dashed border-slate-800 bg-slate-950 rounded-3xl p-8 text-center group-hover:border-emerald-500/50 transition-all">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500"><Upload size={20} /></div>
                  <p className="text-[11px] font-semibold text-slate-400">Drop Evidence Photos</p>
                </div>
              </div>
              {errors.images && <p className="text-[9px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{errors.images}</p>}

              {previewImages.length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold text-slate-600 mb-3">Attached Evidence</p>
                  <div className="grid grid-cols-3 gap-2">
                    {previewImages.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 group">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removePreviewImage(index)} className="absolute top-1 end-1 bg-rose-500 p-1 rounded text-white hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-800 space-y-3">
                <p className="text-[9px] font-semibold text-slate-600">Submission Guidelines</p>
                <ul className="space-y-2">
                  <li className="text-[11px] text-slate-400 flex items-start gap-2"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />Answer from memory and add any detail you know</li>
                  <li className="text-[11px] text-slate-400 flex items-start gap-2"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />You can attach photos or receipts as extra evidence</li>
                </ul>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  form="claim-item-form"
                  disabled={isSubmitting || uploadingImages || isGeneratingQuestions || !questionSessionId || questions.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-slate-950 text-xs font-semibold rounded-2xl hover:bg-emerald-400 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting || uploadingImages ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                  Submit Claim
                </button>
                <button type="button" onClick={() => navigate(-1)} className="w-full px-6 py-3 bg-slate-900 text-slate-300 text-xs font-semibold rounded-2xl hover:text-white transition-all border border-slate-800">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ClaimItemPage;
