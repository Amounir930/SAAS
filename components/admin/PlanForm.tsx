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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan, updatePlan } from '@/lib/api/admin/plans';
import { plans } from "@/lib/db/schema";
type Plan = typeof plans.$inferSelect;
import { Loader2, Save, X } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  maxUsers: z.number().min(1),
  maxContacts: z.number().min(0),
  maxInstances: z.number().min(1),
  isAiEnabled: z.boolean(),
  isFlowBuilderEnabled: z.boolean(),
  isCampaignsEnabled: z.boolean(),
  isTemplatesEnabled: z.boolean(),
  isVoiceCallsEnabled: z.boolean(),
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
      maxUsers: initialData?.maxUsers || 1,
      maxContacts: initialData?.maxContacts || 1000,
      maxInstances: initialData?.maxInstances || 1,
      isAiEnabled: initialData?.isAiEnabled || false,
      isFlowBuilderEnabled: initialData?.isFlowBuilderEnabled || false,
      isCampaignsEnabled: initialData?.isCampaignsEnabled || false,
      isTemplatesEnabled: initialData?.isTemplatesEnabled || false,
      isVoiceCallsEnabled: initialData?.isVoiceCallsEnabled || false,
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
      router.push('/admin/settings/plans');
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
                : 'Set up a new feature plan with limits and capabilities.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Master Plan" {...field} />
                    </FormControl>
                    <FormDescription>The display name for this plan.</FormDescription>
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
                      placeholder="The standard plan with full access..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional description for internal reference.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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