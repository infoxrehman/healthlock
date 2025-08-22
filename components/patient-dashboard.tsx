"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Upload, FileText, Share2, LogOut, Shield, Download, Eye, X, Camera } from "lucide-react"
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Mock types for demo
interface User {
  id: string
  name: string
  role: 'patient' | 'doctor'
}

interface PatientRecord {
  id: string
  patient_id: string
  file_name: string
  file_url: string
  file_size: number
  uploaded_at: string
  shared_with: string[]
  file_type: string
  thumbnail_url?: string
  record_type?: string
}

interface DoctorProfile {
  id: string
  name: string
  email: string
  role: 'doctor'
  record_ids?: string[]
  patients?: string[]
}

interface PatientDashboardProps {
  user: User
  onLogout: () => void
}

// Named export as requested
export function PatientDashboard({ user, onLogout }: PatientDashboardProps) {
  // Set default values for optional props
  const userWithDefaults = user || { id: '1', name: 'John Doe', role: 'patient' as const }
  const onLogoutWithDefault = onLogout || (() => console.log('Logout clicked'))
  
  const [records, setRecords] = useState<PatientRecord[]>([])
  const [doctors, setDoctors] = useState<DoctorProfile[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [sharingRecordId, setSharingRecordId] = useState<string | null>(null)

  // Fetch records and doctors from Supabase on component mount
  useEffect(() => {
    fetchRecords()
    fetchDoctors()
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      // Try to fetch from database first
      const { data, error } = await supabase
        .from('medical-records')
        .select('*')
        .eq('patient_id', userWithDefaults.id)
        .order('uploaded_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching records from database:', error)
        // Fallback to mock data
        const mockRecords: PatientRecord[] = [
          {
            id: '1',
            patient_id: userWithDefaults.id,
            file_name: 'chest-xray-2024.jpg',
            file_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
            thumbnail_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=150&h=150&fit=crop',
            file_size: 2457600,
            uploaded_at: '2024-08-20T10:30:00Z',
            shared_with: ['Dr. Smith'],
            file_type: 'image/jpeg',
            record_type: 'xray'
          },
          {
            id: '2',
            patient_id: userWithDefaults.id,
            file_name: 'blood-test-results.jpg',
            file_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop',
            thumbnail_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=150&h=150&fit=crop',
            file_size: 1843200,
            uploaded_at: '2024-08-18T14:15:00Z',
            shared_with: [],
            file_type: 'image/jpeg',
            record_type: 'lab_result'
          }
        ]
        setRecords(mockRecords)
      } else {
        setRecords(data || [])
      }
    } catch (error) {
      console.error('Error fetching records:', error)
      setUploadError('Failed to load medical records')
    } finally {
      setLoading(false)
    }
  }

  const fetchDoctors = async () => {
    try {
      // First try to fetch from the profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
      
      if (!profilesError && profilesData && profilesData.length > 0) {
        setDoctors(profilesData)
        return
      }
      
      console.log('No doctors found in profiles table, trying doctors table...')
      
      // If profiles table doesn't exist or is empty, try a doctors table
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('*')
      
      if (!doctorsError && doctorsData && doctorsData.length > 0) {
        setDoctors(doctorsData)
        return
      }
      
      console.log('No doctors found in any table, using mock data')
      
      // Fallback to mock data if no doctors found in database
      const mockDoctors: DoctorProfile[] = [
        { id: 'doc1', name: 'Dr. Smith', email: 'dr.smith@example.com', role: 'doctor' },
        { id: 'doc2', name: 'Dr. Johnson', email: 'dr.johnson@example.com', role: 'doctor' },
        { id: 'doc3', name: 'Dr. Williams', email: 'dr.williams@example.com', role: 'doctor' },
      ]
      setDoctors(mockDoctors)
      
    } catch (error) {
      console.error('Error fetching doctors:', error)
      // Use mock data as fallback
      const mockDoctors: DoctorProfile[] = [
        { id: 'doc1', name: 'Dr. Smith', email: 'dr.smith@example.com', role: 'doctor' },
        { id: 'doc2', name: 'Dr. Johnson', email: 'dr.johnson@example.com', role: 'doctor' },
        { id: 'doc3', name: 'Dr. Williams', email: 'dr.williams@example.com', role: 'doctor' },
      ]
      setDoctors(mockDoctors)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }

    console.log('Starting image upload:', file.name)
    setUploading(true)
    setUploadError(null)

    try {
      // Create a mock URL for the uploaded file
      const mockFileUrl = URL.createObjectURL(file)
      
      // Determine record type based on file name
      let recordType = 'medical_image';
      if (file.name.toLowerCase().includes('xray') || file.name.toLowerCase().includes('x-ray')) {
        recordType = 'xray';
      } else if (file.name.toLowerCase().includes('blood') || file.name.toLowerCase().includes('test')) {
        recordType = 'lab_result';
      } else if (file.name.toLowerCase().includes('scan') || file.name.toLowerCase().includes('mri') || file.name.toLowerCase().includes('ct')) {
        recordType = 'scan';
      }
      
      // Save to medical_records table in Supabase
      const { data: insertedRecord, error: dbError } = await supabase
        .from('medical-records')
        .insert({
          patient_id: userWithDefaults.id,
          file_name: file.name,
          file_url: mockFileUrl,
          thumbnail_url: mockFileUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_at: new Date().toISOString(),
          shared_with: [],
          record_type: recordType
        })
        .select()
        .single()
      
      if (dbError) {
        console.error('Error saving to database:', dbError)
        
        // Try again with a default record_type if the first attempt failed
        const { data: retryRecord, error: retryError } = await supabase
          .from('medical-records')
          .insert({
            patient_id: userWithDefaults.id,
            file_name: file.name,
            file_url: mockFileUrl,
            thumbnail_url: mockFileUrl,
            file_size: file.size,
            file_type: file.type,
            uploaded_at: new Date().toISOString(),
            shared_with: [],
            record_type: 'medical_image'
          })
          .select()
          .single()
        
        if (retryError) {
          throw new Error(`Database error: ${retryError.message}`)
        }
        
        // Update local state with the new record
        if (retryRecord) {
          setRecords(prev => [retryRecord, ...prev])
        }
      } else {
        // Update local state with the new record
        if (insertedRecord) {
          setRecords(prev => [insertedRecord, ...prev])
        }
      }
      
      console.log('Image upload and database save completed successfully')
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed. Please check your Supabase configuration.')
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files)
    e.target.value = '' // Reset input
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const handleShare = async (record: PatientRecord, doctorId: string) => {
    try {
      setSharingRecordId(record.id)
      
      // Find the doctor to get their name
      const doctor = doctors.find(d => d.id === doctorId)
      if (!doctor) return
      
      // Update the record in the medical-records table
      const { error: recordError } = await supabase
        .from('medical-records')
        .update({ 
          shared_with: [...record.shared_with, doctor.name] 
        })
        .eq('id', record.id)
      
      if (recordError) {
        console.error('Error updating record:', recordError)
        return
      }
      
      // Update the doctor's profile to include the record ID and patient ID
      const { data: doctorProfile, error: doctorError } = await supabase
        .from('profiles')
        .select('record_ids, patients')
        .eq('id', doctorId)
        .single()
      
      if (doctorError) {
        console.error('Error fetching doctor profile:', doctorError)
        return
      }
      
      // Update record_ids and patients arrays
      const currentRecordIds = doctorProfile?.record_ids || []
      const currentPatients = doctorProfile?.patients || []
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          record_ids: [...currentRecordIds, record.id],
          patients: [...new Set([...currentPatients, userWithDefaults.id])] // Ensure unique patient IDs
        })
        .eq('id', doctorId)
      
      if (updateError) {
        console.error('Error updating doctor profile:', updateError)
        return
      }
      
      // Update local state
      setRecords(prev => prev.map(r => 
        r.id === record.id 
          ? { ...r, shared_with: [...r.shared_with, doctor.name] }
          : r
      ))
      
    } catch (error) {
      console.error('Error sharing record:', error)
    } finally {
      setSharingRecordId(null)
    }
  }

  const handleDownload = (record: PatientRecord) => {
    window.open(record.file_url, '_blank')
  }

  const handlePreview = (record: PatientRecord) => {
    setPreviewImage(record.file_url)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Camera className="h-8 w-8 text-blue-500" />
    }
    return <FileText className="h-8 w-8 text-muted-foreground" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-blue-600">HealthLock</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {userWithDefaults.name}</span>
              <Badge variant="secondary">Patient</Badge>
              <Button variant="outline" size="sm" onClick={onLogoutWithDefault}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="records" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="records">My Medical Images</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload Medical Images</span>
                    </CardTitle>
                    <CardDescription>Upload X-rays, lab results, prescriptions, and other medical images</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          dragActive 
                            ? 'border-blue-400 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <div className="space-y-2">
                          <Label htmlFor="file-upload" className="cursor-pointer">
                            <div className="text-sm font-medium text-gray-900">
                              Click to upload or drag and drop
                            </div>
                            <div className="text-sm text-gray-500">
                              JPG, PNG, GIF up to 10MB
                            </div>
                          </Label>
                          <Input
                            id="file-upload"
                            type="file"
                            onChange={handleInputChange}
                            disabled={uploading}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </div>

                      {uploading && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>Uploading image...</span>
                        </div>
                      )}
                      
                      {uploadError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-600 mb-2">{uploadError}</p>
                          <p className="text-sm text-red-500 mb-2">
                            Make sure you've configured Supabase properly.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setUploadError(null)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Camera className="h-5 w-5" />
                      <span>My Medical Images ({records.length})</span>
                    </CardTitle>
                    <CardDescription>Your uploaded medical images and documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading images...</p>
                      </div>
                    ) : records.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No medical images uploaded yet</p>
                        <p className="text-sm">Upload your first medical image to get started</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {records.map((record) => (
                          <div
                            key={record.id}
                            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                          >
                            {record.thumbnail_url ? (
                              <div className="aspect-video bg-gray-100 relative">
                                <img
                                  src={record.thumbnail_url}
                                  alt={record.file_name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handlePreview(record)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Preview
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                {getFileTypeIcon(record.file_type)}
                              </div>
                            )}
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start space-x-2">
                                  {getFileTypeIcon(record.file_type)}
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-gray-900 truncate">{record.file_name}</h3>
                                    <div className="text-sm text-gray-500 space-y-1">
                                      <div>Uploaded {new Date(record.uploaded_at).toLocaleDateString()}</div>
                                      <div>{formatFileSize(record.file_size)}</div>
                                      {record.record_type && (
                                        <div className="flex items-center space-x-1 text-blue-600">
                                          <Badge variant="outline">{record.record_type}</Badge>
                                        </div>
                                      )}
                                      {record.shared_with.length > 0 && (
                                        <div className="flex items-center space-x-1 text-green-600">
                                          <Share2 className="h-3 w-3" />
                                          <span>Shared with {record.shared_with.length} doctor(s)</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handlePreview(record)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDownload(record)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      disabled={sharingRecordId === record.id}
                                    >
                                      {sharingRecordId === record.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                                      ) : (
                                        <Share2 className="h-4 w-4 mr-1" />
                                      )}
                                      Share
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuLabel>Share with doctor</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {doctors.length === 0 ? (
                                      <DropdownMenuItem disabled>No doctors available</DropdownMenuItem>
                                    ) : (
                                      doctors.map(doctor => (
                                        <DropdownMenuItem 
                                          key={doctor.id}
                                          onClick={() => handleShare(record, doctor.id)}
                                          disabled={record.shared_with.includes(doctor.name)}
                                        >
                                          {doctor.name}
                                          {record.shared_with.includes(doctor.name) && " (Already shared)"}
                                        </DropdownMenuItem>
                                      ))
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your recent uploads and sharing activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    {records.slice(0, 5).map((record, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Uploaded {record.file_name}</span>
                        <span className="text-gray-400">
                          {new Date(record.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>Complete log of all actions performed on your records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">File Name</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Action</th>
                        <th className="text-left py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.id} className="border-b">
                          <td className="py-2">{record.file_name}</td>
                          <td className="py-2">{record.record_type || 'medical_image'}</td>
                          <td className="py-2">Uploaded</td>
                          <td className="py-2">{new Date(record.uploaded_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 bg-white hover:bg-gray-100"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}