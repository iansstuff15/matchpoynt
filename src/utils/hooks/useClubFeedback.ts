import type { ClubFeedbackView, FeedbackFormInput, FeedbackSubmitInput, MemberFeedbackView } from '@matchpoynt/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'

/** The club's feedback form and each recent session's results, as the API works them out (owner). */
export function useClubFeedback(clubId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clubFeedback(clubId),
    queryFn: ({ signal }) => api<ClubFeedbackView>('GET', `/clubs/${encodeURIComponent(clubId)}/feedback`, { signal }),
    enabled,
  })
}

/** Saves the club's form; the API checks it and answers with the page. Failures show in the editor's banner. */
export function useSaveFeedbackForm(clubId: string) {
  const client = useQueryClient()
  return useMutation<ClubFeedbackView, unknown, FeedbackFormInput, { toastId: string | number }>({
    mutationFn: (form) => api<ClubFeedbackView>('PUT', `/clubs/${encodeURIComponent(clubId)}/feedback`, { body: form }),
    onMutate: () => ({ toastId: notifyProgress('Saving the feedback form…') }),
    onSuccess: (view, _form, ctx) => {
      notifyDone(view.form.enabled ? 'Feedback form saved: members are asked after each session' : 'Feedback form saved (off)', { id: ctx?.toastId })
      client.setQueryData(queryKeys.clubFeedback(clubId), view)
    },
    onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
  })
}

/** What a member is asked at a club: the form while it's on, and their recent sessions. */
export function useMemberFeedback(handle: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.memberFeedback(handle),
    queryFn: ({ signal }) => api<MemberFeedbackView>('GET', `/directory/${encodeURIComponent(handle)}/feedback`, { signal }),
    enabled,
  })
}

/** Sends a member's answers about one session. */
export function useSubmitFeedback(handle: string) {
  const client = useQueryClient()
  return useMutation<MemberFeedbackView, unknown, FeedbackSubmitInput & { label: string }, { toastId: string | number }>({
    mutationFn: ({ sessionId, answers }) => api<MemberFeedbackView>('POST', `/directory/${encodeURIComponent(handle)}/feedback`, { body: { sessionId, answers } }),
    onMutate: ({ label }) => ({ toastId: notifyProgress(`Sending your feedback on ${label}…`) }),
    onSuccess: (view, { label }, ctx) => {
      notifyDone(`Thanks! Your feedback on ${label} was sent`, { id: ctx?.toastId })
      client.setQueryData(queryKeys.memberFeedback(handle), view)
    },
    onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
  })
}
