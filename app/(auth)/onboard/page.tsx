"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

export default function OnboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    businessName:   "",
    businessType:   "",
    ownerFirstName: "",
    ownerLastName:  "",
    email:          "",
    phone:          "",
    city:           "",
    state:          "",
    // dental
    npiNumber:      "",
    // restaurant
    cuisineType:    "",
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName:   form.businessName,
          businessType:   form.businessType,
          ownerFirstName: form.ownerFirstName,
          ownerLastName:  form.ownerLastName,
          email:          form.email,
          phone:          form.phone || undefined,
          city:           form.city  || undefined,
          state:          form.state || undefined,
          npiNumber:      form.npiNumber   || undefined,
          cuisineType:    form.cuisineType || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>You&apos;re all set!</CardTitle>
          <CardDescription>
            Check your email for a link to set up your password. Your 14-day free trial has started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push("/login")}>
            Go to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start your 14-day free trial — no credit card required</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Business type */}
          <div className="space-y-2">
            <Label>Business type</Label>
            <Select onValueChange={(v) => set("businessType", String(v))} required>
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                <SelectItem value="DENTAL">Dental Practice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Business name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              placeholder="Joe's Pizza"
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              required
            />
          </div>

          {/* Owner name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.ownerFirstName}
                onChange={(e) => set("ownerFirstName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={form.ownerLastName}
                onChange={(e) => set("ownerLastName", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email + phone */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@business.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone <span className="text-gray-400">(optional)</span></Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>

          {/* Dental-specific */}
          {form.businessType === "DENTAL" && (
            <div className="space-y-2">
              <Label htmlFor="npi">NPI Number</Label>
              <Input
                id="npi"
                value={form.npiNumber}
                onChange={(e) => set("npiNumber", e.target.value)}
                placeholder="1234567890"
              />
            </div>
          )}

          {/* Restaurant-specific */}
          {form.businessType === "RESTAURANT" && (
            <div className="space-y-2">
              <Label htmlFor="cuisine">Cuisine type <span className="text-gray-400">(optional)</span></Label>
              <Input
                id="cuisine"
                value={form.cuisineType}
                onChange={(e) => set("cuisineType", e.target.value)}
                placeholder="Italian, Mexican, Japanese…"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !form.businessType}>
            {loading ? "Creating account…" : "Start free trial"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-gray-900 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
