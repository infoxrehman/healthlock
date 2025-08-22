"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StorageService, type User } from "@/lib/storage"
import { supabase } from "@/lib/supabase"

interface AuthFormProps {
  onLogin: (user: User) => void
}

// Helper to persist user in localStorage (since StorageService.setCurrentUser does not exist)
function persistCurrentUser(user: User) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("currentUser", JSON.stringify(user));
    } catch (e) {
      // ignore
    }
  }
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"patient" | "doctor">("patient")
  const [message, setMessage] = useState("")
  const [loading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")

  const createProfile = async (userId: string) => {
    try {
      // Only send fields that are present in the DB and not managed by auth triggers
      const profileData: any = {
        id: userId,
        full_name: name,
        role: role,
        email: email,
      };

      // Remove undefined/null fields
      Object.keys(profileData).forEach(
        (key) => (profileData[key] === undefined || profileData[key] === null) && delete profileData[key]
      );

      // Use upsert, but do NOT use .select() (which can cause RLS errors if policies are strict)
      const { error } = await supabase
        .from('profiles')
        .upsert([profileData], { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error('Profile creation error:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in createProfile:', error);
      throw error;
    }
  };

  // Alternative: Try insert, then update if exists, but avoid .select()
  const createProfileAlternative = async (userId: string) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      const profileData: any = {
        id: userId,
        full_name: name,
        role: role,
        email: email,
      };

      Object.keys(profileData).forEach(
        (key) => (profileData[key] === undefined || profileData[key] === null) && delete profileData[key]
      );

      if (existingProfile) {
        // Update, no select
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', userId);

        if (error) throw error;
        return true;
      } else {
        // Insert, no select
        const { error } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (error) throw error;
        return true;
      }
    } catch (error) {
      console.error('Alternative profile creation error:', error);
      throw error;
    }
  };

  // Handle both sign up and sign in
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    if (!isLogin) {
      // Sign up
      if (!email || !password || !name || !role) {
        setMessage("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setMessage("Password must be at least 6 characters long");
        setIsLoading(false);
        return;
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email: email, 
          password: password,
        });

        if (authError) {
          setMessage(authError.message);
          setIsLoading(false);
          return;
        }

        if (!authData.user) {
          setMessage("User creation failed");
          setIsLoading(false);
          return;
        }

        try {
          await createProfile(authData.user.id);

          setEmail("");
          setPassword("");
          setName("");
        } catch (profileError) {
          console.log('Primary profile creation failed, trying alternative method...');
          try {
            await createProfileAlternative(authData.user.id);

            setEmail("");
            setPassword("");
            setName("");
          } catch (alternativeError) {
            console.error('Both profile creation methods failed:', alternativeError);
            setMessage("Account was created but profile setup failed. You can update your profile later.");
            window.location.replace("/dashboard");
          }
        }
      } catch (error: any) {
        // Show more specific error if available
        setMessage(error?.message || "Could not create account. Please try again.");
        console.error('Signup error:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Sign in
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          setIsLoading(false);
          return;
        }

        // After successful login, fetch the user's profile to get the role
        const userId = data?.user?.id;
        if (!userId) {
          setMessage("Could not retrieve user information after login.");
          setIsLoading(false);
          return;
        }

        // Fetch the profile from Supabase
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role, email')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          setMessage("Could not fetch user profile.");
          setIsLoading(false);
          return;
        }

        if (!profile || !profile.role) {
          setMessage("User profile or role not found.");
          setIsLoading(false);
          return;
        }

        // Save user info to local storage (optional, if you want to persist)
        const userObj: User = {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role,
        };
        persistCurrentUser(userObj);

        // Call onLogin to update parent state (which will show the correct dashboard)
        onLogin(userObj);

        // Optionally, you can also redirect here if you want:
        // if (profile.role === "doctor") {
        //   window.location.replace("/doctor-dashboard");
        // } else {
        //   window.location.replace("/patient-dashboard");
        // }

      } catch (error: any) {
        setMessage(error.message || "Could not sign in. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif text-primary">HealthLock</CardTitle>
          <CardDescription>Secure patient record sharing platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="Enter your password"
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(value: "patient" | "doctor") => setRole(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {message && (
              <div className={`text-sm text-center p-3 rounded-md ${
                message.includes('successfully') || message.includes('created') 
                  ? 'text-green-600 bg-green-50 border border-green-200' 
                  : 'text-destructive bg-destructive/10 border border-destructive/20'
              }`}>
                {message}
              </div>
            )}

            {debugInfo && (
              <div className="text-xs text-muted-foreground text-center p-2 bg-muted rounded-md">
                Debug: {debugInfo}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                isLogin ? "Sign In" : "Sign Up"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Button
              variant="link"
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage("")
                setDebugInfo("")
              }}
              className="text-sm"
              disabled={loading}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>

          
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {isLogin ? (
                <>
                  Enter your credentials to access your account. 
                  If you're having trouble, make sure you've confirmed your email address.
                </>
              ) : (
                <>
                  Create a new account to get started. 
                  You'll receive an email confirmation link after registration.
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}