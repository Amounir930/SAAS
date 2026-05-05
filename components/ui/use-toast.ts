import { toast as sonnerToast } from 'sonner';

/**
 * UI Toast Bridge
 * Redirects legacy shadcn UI toast calls to sonner.
 */
export const toast = (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
  const { title, description, variant } = props;
  
  if (variant === 'destructive') {
    return sonnerToast.error(title || 'Error', {
      description: description,
    });
  }
  
  return sonnerToast.success(title || 'Success', {
    description: description,
  });
};

export function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  };
}
