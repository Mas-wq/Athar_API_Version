import React from "react";
import { useNavigate } from "react-router";
import Card from "./Card";
import Button from "./Button";

export default function AccessCard({
  icon: Icon,
  title = "Access Required",
  description = "Please log in to continue.",
  actionLabel = "Go to Login",
  actionTo = "/login",
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <Card className="p-8 sm:p-10 text-center max-w-md w-full">
        {Icon ? (
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto mb-6">
            <Icon size={28} className="text-emerald-300" />
          </div>
        ) : null}
        <h2 className="text-2xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-slate-400 mb-7 text-sm leading-relaxed">
          {description}
        </p>
        <Button className="w-full" onClick={() => navigate(actionTo)}>
          {actionLabel}
        </Button>
      </Card>
    </div>
  );
}
