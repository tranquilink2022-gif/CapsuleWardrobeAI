import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Check, X, Loader2 } from "lucide-react";

interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default function InviteAccept() {
  const [, params] = useRoute("/invite/:token");
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
      return await apiRequest(`/api/family/invite/${token}/accept`, 'POST');
    },
    onSuccess: () => {
      setStatus('success');
      queryClient.refetchQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.refetchQueries({ queryKey: ['/api/family/status'] });
      toast({
        title: "Welcome to the family!",
        description: "You now have access to Family tier features",
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
    window.location.href = `/api/login?returnTo=/invite/${token}`;
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
          <Users className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="font-serif text-2xl font-semibold mb-2">Family Invitation</h1>
          <p className="text-muted-foreground mb-6">
            You've been invited to join a family account on Closana. Sign in or create an account to accept.
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
          <h1 className="font-serif text-2xl font-semibold mb-2">Welcome to the Family!</h1>
          <p className="text-muted-foreground mb-6">
            You're now part of the family account and have access to Family tier features.
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
          <h1 className="font-serif text-2xl font-semibold mb-2">Unable to Join</h1>
          <p className="text-muted-foreground mb-6">
            {errorMessage || "There was a problem accepting this invitation."}
          </p>
          <Button onClick={handleGoToHome} variant="outline" data-testid="button-go-home-error">
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-6 text-center">
        <Users className="w-12 h-12 mx-auto text-primary mb-4" />
        <h1 className="font-serif text-2xl font-semibold mb-2">Join Family Account</h1>
        <p className="text-muted-foreground mb-6">
          Hi {user.firstName || 'there'}! You've been invited to join a family account on Closana. 
          As a family member, you'll get access to Premium features including more capsules and jewelry planning.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={handleAccept} 
            className="w-full"
            disabled={acceptMutation.isPending}
            data-testid="button-accept-invite"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGoToHome}
            className="w-full"
            data-testid="button-decline-invite"
          >
            Not Now
          </Button>
        </div>
      </Card>
    </div>
  );
}
