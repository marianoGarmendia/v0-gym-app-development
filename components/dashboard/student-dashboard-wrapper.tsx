"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { OnboardingChat } from "@/components/onboarding/onboarding-chat";
import { StudentDashboard } from "./student-dashboard";

interface StudentDashboardWrapperProps {
  profile: Profile;
}

export function StudentDashboardWrapper({
  profile,
}: StudentDashboardWrapperProps) {
  const [showOnboarding, setShowOnboarding] = useState(
    !profile.onboarding_completed
  );
  const router = useRouter();

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    router.refresh();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return (
      <OnboardingChat
        profile={profile}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  return <StudentDashboard profile={profile} />;
}
