"use client";

import React from "react";
import type { Profile } from "@/lib/types";
import { StudentDashboard } from "./student-dashboard";

interface StudentDashboardWrapperProps {
  profile: Profile;
}

export function StudentDashboardWrapper({
  profile,
}: StudentDashboardWrapperProps) {
  return <StudentDashboard profile={profile} />;
}
