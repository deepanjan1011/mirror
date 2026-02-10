"use client";

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dashboard } from "@/components/dashboard"
import { createClient } from "@/lib/supabase/client"

function DashboardContent() {
  const [user, setUser] = useState<any>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get project ID from URL params
      const projectParam = searchParams.get('project')
      if (projectParam) {
        setProjectId(projectParam)
      } else {
        // No project specified, redirect to projects page
        router.push('/projects')
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router, searchParams, supabase])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white font-mono">Loading...</div>
      </div>
    )
  }

  // Show dashboard if user is authenticated and project is selected
  if (user && projectId) {
    return (
      <div className="w-full min-h-screen bg-black">
        <Dashboard user={user} projectId={projectId} />
      </div>
    )
  }

  return null
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white font-mono">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
