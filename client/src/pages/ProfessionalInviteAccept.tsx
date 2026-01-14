import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Check, X, Loader2 } from "lucide-react";

interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default function ProfessionalInviteAccept() {
  const [, params] = useRoute("/professional-invite/:token");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const token = params?.token;

  const { data: user, isLoading: userLoading } = useQuery<UserData>({
    queryKey: ['/api/auth/user'],
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/professional/invite/${token}/accept`, 'POST');
    },
    onSuccess: () => {
      setStatus('success');
      queryClient.refetchQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.refetchQueries({ queryKey: ['/api/professional/status'] });
      toast({
        title: "Welcome!",
        description: "You're now connected with your professional shopper",
      });
    },
    onError: (error: any) => {
      setStatus('error');
      setErrorMessage(error.message || "Failed to accept invitation");
    },
  });

  useEffect(() => {
    if (!userLoading && user) {
      setStatus('ready');
    }
  }, [userLoading, user]);

  const handleAccept = () => {
    setStatus('loading');
    acceptMutation.mutate();
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  const handleLogin = () => {
    window.location.href = `/api/login?returnTo=/professional-invite/${token}`;
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-6 text-center">
          <X className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="font-serif text-2xl font-semibold mb-2">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">
            This invitation link is invalid or has expired.
          </p>
          <Button onClick={handleGoToHome} data-testid="button-go-home">
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  if (userLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-6 text-center">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <h1 className="font-serif text-2xl font-semibold mb-2">Processing...</h1>
          <p className="text-muted-foreground">
            Please wait while we process your invitation.
          </p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-6 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="font-serif text-2xl font-semibold mb-2">Client Invitation</h1>
          <p className="text-muted-foreground mb-6">
            You've been invited to work with a professional shopper on Closana. Sign in or create an account to accept.
          </p>
          <Button onClick={handleLogin} data-testid="button-login-to-accept">
            Sign In to Accept
          </Button>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-6 text-center">
          <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="font-serif text-2xl font-semibold mb-2">You're All Set!</h1>
          <p className="text-muted-foreground mb-6">
            You're now connected with your professional shopper. They can help you build your perfect wardrobe.
          </p>
          <Button onClick={handleGoToHome} data-testid="button-start-using">
            Start Using Closana
          </Button>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-6 text-center">
          <X className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="font-serif text-2xl font-semibold mb-2">Unable to Accept</h1>
          <p className="text-muted-foreground mb-6">
            {errorMessage || "There was a problem accepting this invitation. It may have expired or already been used."}
          </p>
          <Button onClick={handleGoToHome} data-testid="button-go-home">
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-6 text-center">
        <Briefcase className="w-12 h-12 mx-auto text-primary mb-4" />
        <h1 className="font-serif text-2xl font-semibold mb-2">Professional Shopper Invite</h1>
        <p className="text-muted-foreground mb-6">
          A professional shopper has invited you to be their client. Accept to start your personalized wardrobe journey.
        </p>
        <div className="space-y-3">
          <Button onClick={handleAccept} className="w-full" data-testid="button-accept-invite">
            Accept Invitation
          </Button>
          <Button variant="outline" onClick={handleGoToHome} className="w-full" data-testid="button-decline">
            Not Now
          </Button>
        </div>
      </Card>
    </div>
  );
}
