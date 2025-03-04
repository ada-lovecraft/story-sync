import { MainLayout } from "../_components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "../_components/ui/card";

export default function RoundsPage() {
    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Parse Rounds</h1>
                    <p className="text-muted-foreground">
                        Parse the cleaned chat log into rounds.
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Parse Rounds Step</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>This is a placeholder for the parse rounds step.</p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
} 