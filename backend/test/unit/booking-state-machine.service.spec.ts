import { Test, TestingModule } from "@nestjs/testing";
import { BookingStateMachineService } from "@/modules/booking/services/booking-state-machine.service";
import { BadRequestException } from "@nestjs/common";
import { BookingStatus, BookingEventType } from "@/modules/booking/dto";

describe("BookingStateMachineService", () => {
  let service: BookingStateMachineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingStateMachineService],
    }).compile();

    service = module.get<BookingStateMachineService>(
      BookingStateMachineService
    );
  });

  describe("validateTransition", () => {
    it("should validate valid transitions", () => {
      expect(
        service.validateTransition(
          BookingStatus.PENDING,
          BookingStatus.ACCEPTED
        )
      ).toBe(true);

      expect(
        service.validateTransition(
          BookingStatus.PENDING,
          BookingStatus.CANCELLED
        )
      ).toBe(true);

      expect(
        service.validateTransition(
          BookingStatus.ACCEPTED,
          BookingStatus.IN_PROGRESS
        )
      ).toBe(true);

      expect(
        service.validateTransition(
          BookingStatus.ACCEPTED,
          BookingStatus.CANCELLED
        )
      ).toBe(true);

      expect(
        service.validateTransition(
          BookingStatus.IN_PROGRESS,
          BookingStatus.COMPLETED
        )
      ).toBe(true);

      expect(
        service.validateTransition(
          BookingStatus.IN_PROGRESS,
          BookingStatus.CANCELLED
        )
      ).toBe(true);
    });

    it("should reject invalid transitions", () => {
      expect(
        service.validateTransition(
          BookingStatus.ACCEPTED,
          BookingStatus.PENDING
        )
      ).toBe(false);

      expect(
        service.validateTransition(
          BookingStatus.COMPLETED,
          BookingStatus.IN_PROGRESS
        )
      ).toBe(false);

      expect(
        service.validateTransition(
          BookingStatus.CANCELLED,
          BookingStatus.ACCEPTED
        )
      ).toBe(false);

      expect(
        service.validateTransition(
          BookingStatus.PENDING,
          BookingStatus.COMPLETED
        )
      ).toBe(false);
    });
  });

  describe("getRequiredEventType", () => {
    it("should return correct event types for valid transitions", () => {
      expect(
        service.getRequiredEventType(
          BookingStatus.PENDING,
          BookingStatus.ACCEPTED
        )
      ).toBe(BookingEventType.ACCEPTED);

      expect(
        service.getRequiredEventType(
          BookingStatus.PENDING,
          BookingStatus.CANCELLED
        )
      ).toBe(BookingEventType.CANCELLED);

      expect(
        service.getRequiredEventType(
          BookingStatus.ACCEPTED,
          BookingStatus.IN_PROGRESS
        )
      ).toBe(BookingEventType.CHECKED_IN);

      expect(
        service.getRequiredEventType(
          BookingStatus.ACCEPTED,
          BookingStatus.CANCELLED
        )
      ).toBe(BookingEventType.CANCELLED);

      expect(
        service.getRequiredEventType(
          BookingStatus.IN_PROGRESS,
          BookingStatus.COMPLETED
        )
      ).toBe(BookingEventType.CHECKED_OUT);

      expect(
        service.getRequiredEventType(
          BookingStatus.IN_PROGRESS,
          BookingStatus.CANCELLED
        )
      ).toBe(BookingEventType.CANCELLED);
    });

    it("should throw BadRequestException for invalid transitions", () => {
      expect(() =>
        service.getRequiredEventType(
          BookingStatus.PENDING,
          BookingStatus.COMPLETED
        )
      ).toThrow(BadRequestException);

      expect(() =>
        service.getRequiredEventType(
          BookingStatus.COMPLETED,
          BookingStatus.PENDING
        )
      ).toThrow(BadRequestException);
    });
  });

  describe("validateRequiredEvents", () => {
    it("should validate required events for PENDING status", () => {
      expect(
        service.validateRequiredEvents(BookingStatus.PENDING, [
          BookingEventType.CREATED,
        ])
      ).toBe(true);

      expect(service.validateRequiredEvents(BookingStatus.PENDING, [])).toBe(
        false
      );
    });

    it("should validate required events for ACCEPTED status", () => {
      expect(
        service.validateRequiredEvents(BookingStatus.ACCEPTED, [
          BookingEventType.CREATED,
          BookingEventType.ACCEPTED,
        ])
      ).toBe(true);

      expect(
        service.validateRequiredEvents(BookingStatus.ACCEPTED, [
          BookingEventType.CREATED,
        ])
      ).toBe(false);
    });

    it("should validate required events for IN_PROGRESS status", () => {
      expect(
        service.validateRequiredEvents(BookingStatus.IN_PROGRESS, [
          BookingEventType.CREATED,
          BookingEventType.ACCEPTED,
          BookingEventType.CHECKED_IN,
        ])
      ).toBe(true);

      expect(
        service.validateRequiredEvents(BookingStatus.IN_PROGRESS, [
          BookingEventType.CREATED,
          BookingEventType.ACCEPTED,
        ])
      ).toBe(false);
    });

    it("should validate required events for COMPLETED status", () => {
      expect(
        service.validateRequiredEvents(BookingStatus.COMPLETED, [
          BookingEventType.CREATED,
          BookingEventType.ACCEPTED,
          BookingEventType.CHECKED_IN,
          BookingEventType.CHECKED_OUT,
          BookingEventType.COMPLETED,
        ])
      ).toBe(true);

      expect(
        service.validateRequiredEvents(BookingStatus.COMPLETED, [
          BookingEventType.CREATED,
          BookingEventType.ACCEPTED,
          BookingEventType.CHECKED_IN,
          BookingEventType.CHECKED_OUT,
        ])
      ).toBe(false);
    });

    it("should validate required events for CANCELLED status", () => {
      expect(
        service.validateRequiredEvents(BookingStatus.CANCELLED, [
          BookingEventType.CREATED,
          BookingEventType.CANCELLED,
        ])
      ).toBe(true);

      expect(
        service.validateRequiredEvents(BookingStatus.CANCELLED, [
          BookingEventType.CREATED,
        ])
      ).toBe(false);
    });
  });

  describe("getNextPossibleStatuses", () => {
    it("should return next possible statuses", () => {
      expect(service.getNextPossibleStatuses(BookingStatus.PENDING)).toEqual([
        BookingStatus.ACCEPTED,
        BookingStatus.CANCELLED,
      ]);

      expect(service.getNextPossibleStatuses(BookingStatus.ACCEPTED)).toEqual([
        BookingStatus.IN_PROGRESS,
        BookingStatus.CANCELLED,
      ]);

      expect(
        service.getNextPossibleStatuses(BookingStatus.IN_PROGRESS)
      ).toEqual([BookingStatus.COMPLETED, BookingStatus.CANCELLED]);

      expect(service.getNextPossibleStatuses(BookingStatus.COMPLETED)).toEqual(
        []
      );

      expect(service.getNextPossibleStatuses(BookingStatus.CANCELLED)).toEqual(
        []
      );
    });
  });

  describe("canTransitionTo", () => {
    it("should allow valid transitions with required events", () => {
      const result = service.canTransitionTo(
        BookingStatus.PENDING,
        BookingStatus.ACCEPTED,
        [BookingEventType.CREATED]
      );

      expect(result.canTransition).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should reject invalid transitions", () => {
      const result = service.canTransitionTo(
        BookingStatus.PENDING,
        BookingStatus.COMPLETED,
        [BookingEventType.CREATED]
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toBe("Cannot transition from PENDING to COMPLETED");
    });

    it("should reject transitions with missing events", () => {
      const result = service.canTransitionTo(
        BookingStatus.PENDING,
        BookingStatus.ACCEPTED,
        []
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toBe(
        "Missing required events for current status: CREATED"
      );
    });

    it("should allow ACCEPTED to IN_PROGRESS with all required events", () => {
      const result = service.canTransitionTo(
        BookingStatus.ACCEPTED,
        BookingStatus.IN_PROGRESS,
        [BookingEventType.CREATED, BookingEventType.ACCEPTED]
      );

      expect(result.canTransition).toBe(true);
    });

    it("should reject ACCEPTED to IN_PROGRESS with missing events", () => {
      const result = service.canTransitionTo(
        BookingStatus.ACCEPTED,
        BookingStatus.IN_PROGRESS,
        [BookingEventType.CREATED]
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toBe(
        "Missing required events for current status: ACCEPTED"
      );
    });
  });

  describe("isTerminalState", () => {
    it("should identify terminal states", () => {
      expect(service.isTerminalState(BookingStatus.COMPLETED)).toBe(true);
      expect(service.isTerminalState(BookingStatus.CANCELLED)).toBe(true);
    });

    it("should identify non-terminal states", () => {
      expect(service.isTerminalState(BookingStatus.PENDING)).toBe(false);
      expect(service.isTerminalState(BookingStatus.ACCEPTED)).toBe(false);
      expect(service.isTerminalState(BookingStatus.IN_PROGRESS)).toBe(false);
    });
  });

  describe("canBeCancelled", () => {
    it("should allow cancellation for non-completed bookings", () => {
      expect(service.canBeCancelled(BookingStatus.PENDING)).toBe(true);
      expect(service.canBeCancelled(BookingStatus.ACCEPTED)).toBe(true);
      expect(service.canBeCancelled(BookingStatus.IN_PROGRESS)).toBe(true);
      expect(service.canBeCancelled(BookingStatus.CANCELLED)).toBe(true);
    });

    it("should prevent cancellation for completed bookings", () => {
      expect(service.canBeCancelled(BookingStatus.COMPLETED)).toBe(false);
    });
  });

  describe("requiresCheckInOut", () => {
    it("should identify bookings that require check-in/check-out", () => {
      expect(service.requiresCheckInOut(BookingStatus.IN_PROGRESS)).toBe(true);
    });

    it("should identify bookings that don't require check-in/check-out", () => {
      expect(service.requiresCheckInOut(BookingStatus.PENDING)).toBe(false);
      expect(service.requiresCheckInOut(BookingStatus.ACCEPTED)).toBe(false);
      expect(service.requiresCheckInOut(BookingStatus.COMPLETED)).toBe(false);
      expect(service.requiresCheckInOut(BookingStatus.CANCELLED)).toBe(false);
    });
  });

  describe("getStatusDisplayName", () => {
    it("should return correct display names", () => {
      expect(service.getStatusDisplayName(BookingStatus.PENDING)).toBe(
        "Pending"
      );
      expect(service.getStatusDisplayName(BookingStatus.ACCEPTED)).toBe(
        "Accepted"
      );
      expect(service.getStatusDisplayName(BookingStatus.IN_PROGRESS)).toBe(
        "In Progress"
      );
      expect(service.getStatusDisplayName(BookingStatus.COMPLETED)).toBe(
        "Completed"
      );
      expect(service.getStatusDisplayName(BookingStatus.CANCELLED)).toBe(
        "Cancelled"
      );
    });
  });

  describe("getEventTypeDisplayName", () => {
    it("should return correct display names", () => {
      expect(service.getEventTypeDisplayName(BookingEventType.CREATED)).toBe(
        "Created"
      );
      expect(service.getEventTypeDisplayName(BookingEventType.ACCEPTED)).toBe(
        "Accepted"
      );
      expect(service.getEventTypeDisplayName(BookingEventType.REJECTED)).toBe(
        "Rejected"
      );
      expect(service.getEventTypeDisplayName(BookingEventType.CHECKED_IN)).toBe(
        "Checked In"
      );
      expect(
        service.getEventTypeDisplayName(BookingEventType.CHECKED_OUT)
      ).toBe("Checked Out");
      expect(service.getEventTypeDisplayName(BookingEventType.COMPLETED)).toBe(
        "Completed"
      );
      expect(service.getEventTypeDisplayName(BookingEventType.CANCELLED)).toBe(
        "Cancelled"
      );
    });
  });
});
