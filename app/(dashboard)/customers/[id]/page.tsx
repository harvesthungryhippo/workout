"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Phone, MapPin, Star } from "lucide-react";

interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  address: string | null;
  city: string | null;
  state: string | null;
  totalVisits: number;
  totalSpent: string;
  averageOrderValue: string;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  segments: string[];
  // Dental
  dateOfBirth: string | null;
  insuranceProvider: string | null;
  nextAppointmentDate: string | null;
  // Restaurant
  dietaryPreferences: string[];
  favoriteItems: string[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "bg-green-100 text-green-700",
  INACTIVE: "bg-yellow-100 text-yellow-700",
  CHURNED:  "bg-red-100 text-red-700",
};

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then(setCustomer)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return <p className="text-gray-500">Customer not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {customer.firstName} {customer.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[customer.status] ?? ""}`}>
              {customer.status.charAt(0) + customer.status.slice(1).toLowerCase()}
            </span>
            {customer.segments.map((seg) => (
              <Badge key={seg} variant="secondary" className="text-xs">{seg}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <Row label="Total visits"        value={customer.totalVisits} />
              <Row label="Total spent"         value={`$${Number(customer.totalSpent).toFixed(2)}`} />
              <Row label="Avg. order value"    value={`$${Number(customer.averageOrderValue).toFixed(2)}`} />
              <Row label="First visit"         value={customer.firstVisitDate ? new Date(customer.firstVisitDate).toLocaleDateString() : undefined} />
              <Row label="Last visit"          value={customer.lastVisitDate  ? new Date(customer.lastVisitDate).toLocaleDateString()  : undefined} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loyalty</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <Row label="Points balance" value={customer.loyaltyPoints} />
              <Row label="Tier"           value={customer.loyaltyTier.charAt(0) + customer.loyaltyTier.slice(1).toLowerCase()} />
            </CardContent>
          </Card>

          {/* Dental-specific */}
          {(customer.dateOfBirth || customer.insuranceProvider || customer.nextAppointmentDate) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Patient info</CardTitle></CardHeader>
              <CardContent className="divide-y">
                <Row label="Date of birth"       value={customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : undefined} />
                <Row label="Insurance provider"  value={customer.insuranceProvider} />
                <Row label="Next appointment"    value={customer.nextAppointmentDate ? new Date(customer.nextAppointmentDate).toLocaleDateString() : undefined} />
              </CardContent>
            </Card>
          )}

          {/* Restaurant-specific */}
          {customer.dietaryPreferences?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {customer.dietaryPreferences.map((p) => (
                    <Badge key={p} variant="outline">{p}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <a href={`mailto:${customer.email}`} className="hover:text-gray-900 truncate">
                  {customer.email}
                </a>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {customer.phone}
                </div>
              )}
              {customer.city && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{[customer.address, customer.city, customer.state].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full text-sm" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send email
              </Button>
              <Button variant="outline" className="w-full text-sm" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Add loyalty points
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
