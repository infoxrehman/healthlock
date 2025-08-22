"use client"

import { useState, useEffect } from "react"
import { AuthForm } from "@/components/auth-form"
import { PatientDashboard } from "@/components/patient-dashboard"
import { DoctorDashboard } from "@/components/doctor-dashboard"
import { StorageService, type User } from "@/lib/storage"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await StorageService.getCurrentUser()
      setUser(currentUser)
      setLoading(false)
    }

    checkUser()
  }, [])

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
  }

  const handleLogout = async () => {
    await StorageService.logout()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-background">
      {user.role === "patient" ? (
        <PatientDashboard user={user} onLogout={handleLogout} />
      ) : (
        <DoctorDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  )
}
