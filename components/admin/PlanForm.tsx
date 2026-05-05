'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan, updatePlan } from '@/lib/api/admin/plans';
import { plans } from "@/lib/db/schema";
type Plan = typeof plans.$inferSelect;
import { Loader2, Save, X } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  amount: z.number().min(0, 'Amount must be non-negative'),
  currency: z.string().length(3),
  interval: z.enum(['month', 'year']),
  trialDays: z.number().min(0).max(365),
  maxUsers: z.number().min(1),
  maxContacts: z.number().min(0),
  maxInstances: z.number().min(1),
  isAiEnabled: z.boolean(),
  isFlowBuilderEnabled: z.boolean(),
  isCampaignsEnabled: z.boolean(),
  isTemplatesEnabled: z.boolean(),
  isVoiceCallsEnabled: z.boolean(),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  gatewayId: z.number().nullable().optional(),
});

interface PlanFormProps {
  initialData?: Plan | null;
}

export function PlanForm({ initialData }: PlanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      amount: initialData?.amount || 0,
      currency: initialData?.currency || 'usd',
      interval: (initialData?.interval as 'month' | 'year') || 'month',
      trialDays: initialData?.trialDays || 0,
      maxUsers: initialData?.maxUsers || 1,
      maxContacts: initialData?.maxContacts || 1000,
      maxInstances: initialData?.maxInstances || 1,
      isAiEnabled: initialData?.isAiEnabled || false,
      isFlowBuilderEnabled: initialData?.isFlowBuilderEnabled || false,
      isCampaignsEnabled: initialData?.isCampaignsEnabled || false,
      isTemplatesEnabled: initialData?.isTemplatesEnabled || false,
      isVoiceCallsEnabled: initialData?.isVoiceCallsEnabled || false,
      stripeProductId: initialData?.stripeProductId || '',
      stripePriceId: initialData?.stripePriceId || '',
      gatewayId: initialData?.gatewayId || null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (initialData) {
        return updatePlan(initialData.id, values);
      } else {
        return createPlan(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast.success(`Plan ${initialData ? 'updated' : 'created'} successfully`);
      router.push('/admin/billing/plans');
    },
    onError: (error) => {
      toast.error('Failed to save plan', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{initialData ? 'Edit Plan' : 'Create New Plan'}</CardTitle>
            <CardDescription>
              {initialData
                ? 'Update the plan details below.'
                : 'Set up a new subscription plan with pricing and feature limits.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Basic Plan" {...field} />
                    </FormControl>
                    <FormDescription>The display name for this plan.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Interval</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>How often customers are billed.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A simple plan for small teams just getting started..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional description shown to customers.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="9.99"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>Price in dollars (e.g., 9.99).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trialDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trial Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="365"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>Number of trial days offered.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={3} />
                    </FormControl>
                    <FormDescription>3-letter currency code (e.g., usd).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="maxUsers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Users</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>Maximum number of team members.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxContacts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Contacts</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>Maximum number of stored contacts.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxInstances"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Instances</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>Maximum number of active automations.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">Features</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="isAiEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>AI Features</FormLabel>
                        <FormDescription>Enable AI-powered capabilities.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFlowBuilderEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Flow Builder</FormLabel>
                        <FormDescription>Access to visual workflow builder.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isCampaignsEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Campaigns</FormLabel>
                        <FormDescription>Ability to create marketing campaigns.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isTemplatesEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Templates</FormLabel>
                        <FormDescription>Access to message templates.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isVoiceCallsEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Voice Calls</FormLabel>
                        <FormDescription>Enable voice call functionality.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">Integration IDs</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="stripeProductId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stripe Product ID</FormLabel>
                      <FormControl>
                        <Input placeholder="prod_..." {...field} />
                      </FormControl>
                      <FormDescription>Stripe product identifier (optional).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stripePriceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stripe Price ID</FormLabel>
                      <FormControl>
                        <Input placeholder="price_..." {...field} />
                      </FormControl>
                      <FormDescription>Stripe price identifier (optional).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Save {initialData ? 'Changes' : 'Plan'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}