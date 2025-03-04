import { MainLayout } from "../_components/layout/main-layout";
import { CleanStep } from "../_components/workflow/clean-step";

export default function CleanPage() {
    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clean & Format</h1>
                    <p className="text-muted-foreground">
                        Clean and format the uploaded chat log.
                    </p>
                </div>
                <CleanStep />
            </div>
        </MainLayout>
    );
} 