import { MainLayout } from "../_components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "../_components/ui/card";

export default function ChaptersPage() {
    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chapter Chunking</h1>
                    <p className="text-muted-foreground">
                        Organize rounds into chapters.
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Chapter Chunking Step</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>This is a placeholder for the chapter chunking step.</p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
} 