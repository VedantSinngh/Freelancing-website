import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, User, Mail, Lock, CheckCircle2 } from 'lucide-react';

type UserRole = 'admin' | 'client' | 'freelancer' | 'consultant';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetMode, setResetMode] = useState(false);
  
  const { signIn, signUp, forgotPassword, resetPassword, user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const roles = [
    { value: 'client', label: 'Client', description: 'Post projects and hire talent', icon: '💼' },
    { value: 'freelancer', label: 'Freelancer', description: 'Find and bid on projects', icon: '👨‍💻' },
    { value: 'consultant', label: 'Consultant', description: 'Provide expert guidance', icon: '🎯' },
    { value: 'admin', label: 'Admin', description: 'Platform management', icon: '⚙️' }
  ];

  // Redirect if already logged in - using useEffect for stability
  useEffect(() => {
    if (user && userRole) {
      navigate(`/dashboard/${userRole}`);
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        if (!resetMode) {
          const { error, message, token } = await forgotPassword(email);
          if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
          } else {
            toast({ title: 'Token Generated', description: `Check console or use this token: ${token}` });
            setResetMode(true);
          }
        } else {
          const { error, message } = await resetPassword(resetToken, password);
          if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
          } else {
            toast({ title: 'Success', description: 'Password reset successfully. Please sign in.' });
            setIsForgotPassword(false);
            setResetMode(false);
            setPassword('');
          }
        }
        setLoading(false);
        return;
      }

      if (isSignUp) {
        if (!fullName) {
          toast({
            title: 'Full Name Required',
            description: 'Please enter your full name to create an account.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, selectedRole, fullName);
        
        if (error) {
          toast({
            title: 'Sign up failed',
            description: error.message || 'An error occurred during registration',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Account Created',
            description: 'Redirecting to your dashboard...'
          });
          // Redirection will be handled by useEffect or here as a fallback
          navigate(`/dashboard/${selectedRole}`);
        }
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          toast({
            title: 'Sign in failed',
            description: error.message || 'Invalid email or password',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Welcome Back!',
            description: 'Successfully signed in.'
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected system error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border border-border/50 backdrop-blur-xl bg-card/80 shadow-2xl overflow-hidden rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
          
          <CardHeader className="space-y-1 pb-6 pt-8 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? 'signup' : 'signin'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  {isForgotPassword ? (resetMode ? 'Reset Password' : 'Forgot Password') : isSignUp ? 'Join IdeaBloom' : 'Welcome Back'}
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  {isForgotPassword 
                    ? (resetMode ? 'Enter your reset token and new password' : 'Enter your email to receive a reset link')
                    : isSignUp 
                    ? 'Start your journey of innovation today' 
                    : 'Sign in to access your synchronized workspace'}
                </CardDescription>
              </motion.div>
            </AnimatePresence>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="popLayout">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={isSignUp}
                        className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-xl"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isForgotPassword ? (
                <>
                  <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{isForgotPassword ? 'New Password' : 'Password'}</Label>
                  {!isSignUp && !isForgotPassword && (
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-primary hover:underline font-medium">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-xl"
                  />
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-2 overflow-hidden"
                  >
                    <Label className="text-sm font-medium">Select Your Role</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {roles.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setSelectedRole(role.value as UserRole)}
                          className={`relative group p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden ${
                            selectedRole === role.value
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-inner'
                              : 'border-border/50 bg-background/50 hover:border-primary/30 hover:bg-primary/[0.02]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xl">{role.icon}</span>
                            {selectedRole === role.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              </motion.div>
                            )}
                          </div>
                          <div className="font-bold text-sm tracking-tight">{role.label}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight">{role.description}</div>
                          
                          {selectedRole === role.value && (
                            <motion.div 
                              layoutId="activeRole"
                              className="absolute inset-0 bg-primary/5 -z-10"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </>
              ) : (
                <>
                  {!resetMode ? (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="resetToken">Reset Token</Label>
                        <Input
                          id="resetToken"
                          type="text"
                          placeholder="Paste token here"
                          value={resetToken}
                          onChange={(e) => setResetToken(e.target.value)}
                          required
                          className="h-11 bg-background/50 border-border/50 transition-all rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-xl"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all transform hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-primary to-accent text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    {isForgotPassword ? (resetMode ? 'Reset Password' : 'Send Reset Link') : isSignUp ? 'Create Account' : 'Sign In Now'}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setResetMode(false); }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium inline-flex items-center gap-1 group"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" /> Back to sign in
                </button>
              ) : (
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium inline-flex items-center gap-1 group"
                >
                {isSignUp ? (
                  <>
                    Already have an account? <span className="text-primary group-hover:underline">Sign in</span>
                  </>
                ) : (
                  <>
                    Don't have an account? <span className="text-primary group-hover:underline">Create one</span>
                  </>
                )}
              </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
