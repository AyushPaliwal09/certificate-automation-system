
import Event from "../models/Event.js";

// Create Event
export const createEvent = async (req, res) => {
  try {
    const { title, description, date, venue } = req.body;

    if (!title?.trim() || !date) {
      return res.status(400).json({
        success: false,
        message: "Event title and date are required.",
      });
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid event date.",
      });
    }

    const event = await Event.create({
      title: title.trim(),
      description,
      date: parsedDate,
      venue,
      status: "upcoming",
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully!",
      data: event,
    });

  } catch (error) {
    console.error("Create Event Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create event.",
    });
  }
};


// Get All Events (Admin)
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });

  } catch (error) {
    console.error("Get Events Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch events.",
    });
  }
};


// Get Single Event
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: event,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch event.",
    });
  }
};


// Update Event
export const updateEvent = async (req, res) => {
  try {
    const { title, description, date, venue, status } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      {
        title,
        description,
        date,
        venue,
        status,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event updated successfully!",
      data: event,
    });

  } catch (error) {
    console.error("Update Event Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update event.",
    });
  }
};


// Delete Event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // Prevent deletion if forms are associated
    const Form = (await import("../models/Form.js")).default;

    const existingForm = await Form.exists({
      event: event._id,
    });

    if (existingForm) {
      return res.status(409).json({
        success: false,
        message: "This event has associated forms. Close it instead of deleting.",
      });
    }

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully!",
    });

  } catch (error) {
    console.error("Delete Event Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete event.",
    });
  }
};
