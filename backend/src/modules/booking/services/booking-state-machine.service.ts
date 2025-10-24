import { Injectable, BadRequestException } from "@nestjs/common";
import { BookingStatus, BookingEventType } from "../dto";

@Injectable()
export class BookingStateMachineService {
  private readonly validTransitions: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING]: [
      BookingStatus.ACCEPTED,
      BookingStatus.REJECTED,
      BookingStatus.CANCELLED,
    ],
    [BookingStatus.ACCEPTED]: [
      BookingStatus.IN_PROGRESS,
      BookingStatus.CANCELLED,
    ],
    [BookingStatus.REJECTED]: [], // Terminal state
    [BookingStatus.IN_PROGRESS]: [
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
    ],
    [BookingStatus.COMPLETED]: [], // Terminal state
    [BookingStatus.CANCELLED]: [], // Terminal state
  };

  private readonly requiredEvents: Record<BookingStatus, BookingEventType[]> = {
    [BookingStatus.PENDING]: [BookingEventType.CREATED],
    [BookingStatus.ACCEPTED]: [
      BookingEventType.CREATED,
      BookingEventType.ACCEPTED,
    ],
    [BookingStatus.REJECTED]: [
      BookingEventType.CREATED,
      BookingEventType.REJECTED,
    ],
    [BookingStatus.IN_PROGRESS]: [
      BookingEventType.CREATED,
      BookingEventType.ACCEPTED,
      BookingEventType.CHECKED_IN,
    ],
    [BookingStatus.COMPLETED]: [
      BookingEventType.CREATED,
      BookingEventType.ACCEPTED,
      BookingEventType.CHECKED_IN,
      BookingEventType.CHECKED_OUT,
      BookingEventType.COMPLETED,
    ],
    [BookingStatus.CANCELLED]: [
      BookingEventType.CREATED,
      BookingEventType.CANCELLED,
    ],
  };

  /**
   * Validate if a status transition is allowed
   */
  validateTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus
  ): boolean {
    const allowedTransitions = this.validTransitions[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get the event type required for a status transition
   */
  getRequiredEventType(
    currentStatus: BookingStatus,
    newStatus: BookingStatus
  ): BookingEventType {
    const eventMap: Record<string, BookingEventType> = {
      [`${BookingStatus.PENDING}-${BookingStatus.ACCEPTED}`]:
        BookingEventType.ACCEPTED,
      [`${BookingStatus.PENDING}-${BookingStatus.CANCELLED}`]:
        BookingEventType.CANCELLED,
      [`${BookingStatus.ACCEPTED}-${BookingStatus.IN_PROGRESS}`]:
        BookingEventType.CHECKED_IN,
      [`${BookingStatus.ACCEPTED}-${BookingStatus.CANCELLED}`]:
        BookingEventType.CANCELLED,
      [`${BookingStatus.IN_PROGRESS}-${BookingStatus.COMPLETED}`]:
        BookingEventType.CHECKED_OUT,
      [`${BookingStatus.IN_PROGRESS}-${BookingStatus.CANCELLED}`]:
        BookingEventType.CANCELLED,
    };

    const key = `${currentStatus}-${newStatus}`;
    const eventType = eventMap[key];

    if (!eventType) {
      throw new BadRequestException(
        `Invalid transition from ${currentStatus} to ${newStatus}`
      );
    }

    return eventType;
  }

  /**
   * Validate if all required events exist for a status
   */
  validateRequiredEvents(
    status: BookingStatus,
    existingEvents: BookingEventType[]
  ): boolean {
    const requiredEvents = this.requiredEvents[status];
    return requiredEvents.every((event) => existingEvents.includes(event));
  }

  /**
   * Get the next possible statuses from current status
   */
  getNextPossibleStatuses(currentStatus: BookingStatus): BookingStatus[] {
    return this.validTransitions[currentStatus];
  }

  /**
   * Check if a booking can be transitioned to a new status
   */
  canTransitionTo(
    currentStatus: BookingStatus,
    newStatus: BookingStatus,
    existingEvents: BookingEventType[]
  ): { canTransition: boolean; reason?: string } {
    // Check if transition is valid
    if (!this.validateTransition(currentStatus, newStatus)) {
      return {
        canTransition: false,
        reason: `Cannot transition from ${currentStatus} to ${newStatus}`,
      };
    }

    // Check if we have the required events for the current status
    if (!this.validateRequiredEvents(currentStatus, existingEvents)) {
      const requiredEvents = this.requiredEvents[currentStatus];
      const missingEvents = requiredEvents.filter(
        (event) => !existingEvents.includes(event)
      );
      return {
        canTransition: false,
        reason: `Missing required events for current status: ${missingEvents.join(
          ", "
        )}`,
      };
    }

    return { canTransition: true };
  }

  /**
   * Check if a booking is in a terminal state
   */
  isTerminalState(status: BookingStatus): boolean {
    return (
      status === BookingStatus.COMPLETED || status === BookingStatus.CANCELLED
    );
  }

  /**
   * Check if a booking can be cancelled
   */
  canBeCancelled(status: BookingStatus): boolean {
    return status !== BookingStatus.COMPLETED;
  }

  /**
   * Check if a booking requires check-in/check-out for completion
   */
  requiresCheckInOut(status: BookingStatus): boolean {
    return status === BookingStatus.IN_PROGRESS;
  }

  /**
   * Get status display name
   */
  getStatusDisplayName(status: BookingStatus): string {
    const displayNames: Record<BookingStatus, string> = {
      [BookingStatus.PENDING]: "Pending",
      [BookingStatus.ACCEPTED]: "Accepted",
      [BookingStatus.REJECTED]: "Rejected",
      [BookingStatus.IN_PROGRESS]: "In Progress",
      [BookingStatus.COMPLETED]: "Completed",
      [BookingStatus.CANCELLED]: "Cancelled",
    };

    return displayNames[status];
  }

  /**
   * Get event type display name
   */
  getEventTypeDisplayName(eventType: BookingEventType): string {
    const displayNames: Record<BookingEventType, string> = {
      [BookingEventType.CREATED]: "Created",
      [BookingEventType.ACCEPTED]: "Accepted",
      [BookingEventType.REJECTED]: "Rejected",
      [BookingEventType.CHECKED_IN]: "Checked In",
      [BookingEventType.CHECKED_OUT]: "Checked Out",
      [BookingEventType.COMPLETED]: "Completed",
      [BookingEventType.CANCELLED]: "Cancelled",
    };

    return displayNames[eventType];
  }
}
