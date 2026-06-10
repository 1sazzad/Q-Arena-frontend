import React from "react";
import { Link } from "react-router-dom";
import { Card, Button } from "../ui";

export default function LockedPreviewCard({ title = "Preview locked", description = "Create an account to view full content." }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>
          <div className="text-right">
            <Button as={Link} to="/register">Register to unlock</Button>
          </div>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/60" />
    </Card>
  );
}
