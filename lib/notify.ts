import axios from 'axios'
import { toast } from 'sonner'

/**
 * Which kind of snackbar a problem deserves.
 *   warning: something the person can put right (a missing field, a file that is too big, a rule the app enforces)
 *   error:   something that failed (the server, the network, the browser) and was not their doing
 * Plain \`new Error('Enter an amount')\` messages written for people are warnings; anything else gets the fallback text as an error.
 */
export function toastProblem(e: unknown, fallback: string) {
  if (axios.isAxiosError(e)) return toast.error(String(e.response?.data?.error || fallback))
  if (e instanceof Error && e.constructor === Error && e.message) return toast.warning(e.message)
  return toast.error(fallback)
}
