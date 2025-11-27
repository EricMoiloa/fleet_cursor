<?php

namespace App\Notifications;

use App\Models\DispatchRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class DispatchRequestStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public DispatchRequest $request) {}

    public function via($notifiable): array
    {
        // DB always; add 'mail' if you want emails immediately too
        return ['database']; // or ['database', 'mail']
    }

    public function toArray($notifiable): array
    {
        return [
            'type'        => 'dispatch.status',
            'dispatch_id' => $this->request->id,
            'status'      => $this->request->status,     // approved|denied|pending
            'note'        => $this->request->note,
            'vehicle_id'  => $this->request->vehicle_id ?? null,
            'start_at'    => $this->request->start_at,
            'origin'      => $this->request->origin,
            'destination' => $this->request->destination,
        ];
    }

    // Optional email
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your vehicle request was '.$this->request->status)
            ->line('Status: '.$this->request->status)
            ->line('Note: '.($this->request->note ?? '—'))
            ->line('Request ID: '.$this->request->id);
    }
}
