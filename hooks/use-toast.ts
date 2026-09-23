export function useToast() {
  return {
    toast: (props: { title: string; description?: string; variant?: "default" | "destructive" }) => {
      console.log(`[Toast ${props.variant || 'default'}] ${props.title}: ${props.description}`);
      if (props.variant === 'destructive') {
        alert(`${props.title}: ${props.description}`);
      }
    }
  }
}
