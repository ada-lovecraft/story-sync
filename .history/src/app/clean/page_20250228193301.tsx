import { MainLayout } from "../_components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "../_components/ui/card";

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
                <Card>
                    <CardHeader>
                        <CardTitle>Clean/Format Step</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>This is a placeholder for the clean/format step.</p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
} 