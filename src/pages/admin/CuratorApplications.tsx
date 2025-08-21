import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function CuratorApplications() {
  const navigate = useNavigate();

  // Mock data for curator applications
  const applications = [
    {
      id: 1,
      fullName: "John Smith",
      email: "john.smith@email.com",
      education: "Master's in Art History, Yale University",
      experience: "5 years as Assistant Curator at Metropolitan Museum",
      motivation: "Passionate about sharing historical art with wider audiences...",
      status: "pending",
      submittedAt: "2024-01-15"
    },
    {
      id: 2,
      fullName: "Sarah Johnson",
      email: "sarah.j@email.com",
      education: "PhD in Museum Studies, Harvard University",
      experience: "3 years at Louvre, specializing in Renaissance period",
      motivation: "Dedicated to preserving cultural heritage...",
      status: "approved",
      submittedAt: "2024-01-10"
    }
  ];

  const handleApprove = (id: number) => {
    console.log(`Approved application ${id}`);
    // Handle approval logic
  };

  const handleReject = (id: number) => {
    console.log(`Rejected application ${id}`);
    // Handle rejection logic
  };

  return (
    <div className="p-6">
      {/* Header with back arrow */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Curator Applications</h1>
          <p className="text-muted-foreground">
            Review and manage upgrade to curator requests
          </p>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-6">
        {applications.map((application) => (
          <Card key={application.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{application.fullName}</CardTitle>
                  <p className="text-muted-foreground">{application.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(application.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  variant={
                    application.status === 'approved' ? 'default' : 
                    application.status === 'rejected' ? 'destructive' : 
                    'secondary'
                  }
                >
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Educational Background</h4>
                <p className="text-muted-foreground">{application.education}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Professional Experience</h4>
                <p className="text-muted-foreground">{application.experience}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Motivation</h4>
                <p className="text-muted-foreground">{application.motivation}</p>
              </div>

              {application.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => handleApprove(application.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleReject(application.id)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}