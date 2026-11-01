import { type ExternalToast,toast } from 'sonner';

import { showToast, type ShowToastOptions } from '@/components/ds/Toast/Toast';
import { dineroToasterMounted } from '@/lib/toastTarget';

type Message = Parameters<typeof toast>[0];
type Tone = NonNullable<ShowToastOptions['tone']>;

/** Sonner-shaped options; on the Dinero toaster only id, duration, action, description and cancel (as a second button next to action) are carried. */
export type NotifyOptions = ExternalToast;

function toDinero(message: Message, tone: Tone, options?: NotifyOptions, forever?: boolean) {
  const action = options?.action;
  const hasAction = action && typeof action === 'object' && 'label' in action && typeof action.label === 'string' && 'onClick' in action;
  const cancel = options?.cancel;
  const hasCancel = hasAction && cancel && typeof cancel === 'object' && 'label' in cancel && typeof cancel.label === 'string';
  const text = typeof message === 'function' ? '' : message;
  return showToast(
    options?.description && typeof text === 'string' && typeof options.description === 'string'
      ? `${text} (${options.description})`
      : text,
    {
      id: options?.id === undefined ? undefined : String(options.id),
      tone,
      duration: forever ? Infinity : options?.duration,
      action: hasAction
        ? {
            label: String(action.label),
            onSelect: () =>
              action.onClick({ preventDefault() {} } as unknown as React.MouseEvent<HTMLButtonElement>),
          }
        : undefined,
      secondaryAction: hasCancel
        ? {
            label: String(cancel.label),
            onSelect: () =>
              cancel.onClick?.({ preventDefault() {} } as unknown as React.MouseEvent<HTMLButtonElement>),
          }
        : undefined,
    },
  );
}

/** Forward the options argument only when given, so a call matches a bare sonner call exactly. */
const rest = (o?: NotifyOptions): [NotifyOptions] | [] => (o === undefined ? [] : [o]);

/**
 * Toasts that land on whichever toaster is mounted: Dinero's, else sonner's (identical to calling sonner
 * directly). Loading has no Dinero look, so it is a neutral toast
 * that stays until dismissed or replaced by id.
 */
export const notify = {
  success: (m: Message, o?: NotifyOptions) => (dineroToasterMounted() ? toDinero(m, 'success', o) : toast.success(m, ...rest(o))),
  error: (m: Message, o?: NotifyOptions) => (dineroToasterMounted() ? toDinero(m, 'danger', o) : toast.error(m, ...rest(o))),
  info: (m: Message, o?: NotifyOptions) => (dineroToasterMounted() ? toDinero(m, 'info', o) : toast.info(m, ...rest(o))),
  warning: (m: Message, o?: NotifyOptions) => (dineroToasterMounted() ? toDinero(m, 'warning', o) : toast.warning(m, ...rest(o))),
  message: (m: Message, o?: NotifyOptions) => (dineroToasterMounted() ? toDinero(m, 'neutral', o) : toast.message(m, ...rest(o))),
  loading: (m: Message, o?: NotifyOptions) =>
    dineroToasterMounted() ? toDinero(m, 'neutral', o, true) : toast.loading(m, ...rest(o)),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
