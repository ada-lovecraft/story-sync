"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ScrollArea } from "@/app/_components/ui/scroll-area";
import { ThemeToggle } from "../theme-toggle";
import { cn } from "@/lib/utils";
import { useWorkflow, WORKFLOW_STEPS, type WorkflowStep } from "../workflow/workflow-provider";
import { WorkflowStepper } from "../workflow/workflow-navigation";

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const pathname = usePathname();
    const { currentStep, goToStep, setCurrentStep } = useWorkflow();

    // Map pathname to workflow step
    React.useEffect(() => {
        const pathToStep: Record<string, WorkflowStep> = {
            "/": "UPLOAD",
            "/clean": "CLEAN",
            "/rounds": "ROUNDS",
            "/chapters": "CHAPTERS",
        };

        const step = pathToStep[pathname];
        if (step && step !== currentStep) {
            // Update current step based on pathname without navigating
            // This prevents loops when route changes from other sources
            setCurrentStep(step);
        }
    }, [pathname, currentStep, setCurrentStep]);

    return (
        <div className="flex min-h-screen flex-col">
            {/* Navbar */}
            <header className="sticky top-0 z-10 border-b bg-background">
                <div className="container flex h-14 items-center px-4">
                    <div className="mr-4">
                        <Link href="/" className="flex items-center">
                            <span className="font-bold">ChatLog Cleaner</span>
                        </Link>
                    </div>
                    <div className="ml-auto flex items-center space-x-4">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 border-r">
                    <ScrollArea className="h-[calc(100vh-3.5rem)]">
                        <div className="px-3 py-4">
                            <h2 className="mb-2 px-4 text-lg font-semibold">Workflow</h2>
                            <nav className="space-y-1">
                                {(Object.keys(WORKFLOW_STEPS) as WorkflowStep[]).map((step) => {
                                    const stepData = WORKFLOW_STEPS[step];
                                    const isActive = currentStep === step;

                                    return (
                                        <button
                                            key={step}
                                            onClick={() => goToStep(step)}
                                            className={cn(
                                                "w-full text-left flex items-center rounded-md px-3 py-2 text-sm font-medium",
                                                "hover:bg-accent hover:text-accent-foreground",
                                                isActive && "bg-accent text-accent-foreground"
                                            )}
                                        >
                                            {stepData.label}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="container py-6">
                        <div className="mb-6">
                            <WorkflowStepper />
                        </div>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
} 