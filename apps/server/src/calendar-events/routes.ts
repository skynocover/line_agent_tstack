import { Hono } from 'hono';
import type { AppContext } from '../index';
import { CalendarEventController } from './controller';

const calendarEvents = new Hono<AppContext>();

// Get user's calendar events with pagination and filtering
calendarEvents.get('/user/:userId/events', async (c) => {
  const userId = c.req.param('userId');
  const page = Number.parseInt(c.req.query('page') || '1');
  const limit = Number.parseInt(c.req.query('limit') || '10');
  const sort = c.req.query('sort');
  const order = c.req.query('order') as 'asc' | 'desc' | undefined;
  const filter = c.req.query('filter');
  const startTime = c.req.query('startTime');
  const endTime = c.req.query('endTime');

  const db = c.get('db');
  const controller = new CalendarEventController(db);

  try {
    const response = await controller.getUserEvents(
      userId,
      page,
      limit,
      sort,
      order,
      filter,
      startTime,
      endTime,
    );
    return c.json(response);
  } catch (error) {
    console.error('Error fetching user events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

// Create a new calendar event
calendarEvents.post('/user/:userId/events', async (c) => {
  const userId = c.req.param('userId');
  const eventData = await c.req.json();

  const db = c.get('db');
  const controller = new CalendarEventController(db);

  try {
    const newEvent = await controller.createEvent({ ...eventData, userId });
    return c.json(newEvent, 201);
  } catch (error) {
    console.error('Error creating event:', error);
    return c.json({ error: 'Failed to create event' }, 500);
  }
});

// Update a calendar event
calendarEvents.patch('/user/:userId/events/:eventId', async (c) => {
  const eventId = Number.parseInt(c.req.param('eventId'));
  const userId = c.req.param('userId');
  const eventData = await c.req.json();

  const db = c.get('db');
  const controller = new CalendarEventController(db);

  try {
    const updatedEvent = await controller.updateEvent(eventId, userId, eventData);
    if (!updatedEvent) {
      return c.json({ error: 'Event not found or unauthorized' }, 404);
    }
    return c.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return c.json({ error: 'Failed to update event' }, 500);
  }
});

// Delete a calendar event
calendarEvents.delete('/user/:userId/events/:eventId', async (c) => {
  const eventId = Number.parseInt(c.req.param('eventId'));
  const userId = c.req.param('userId');

  const db = c.get('db');
  const controller = new CalendarEventController(db);

  try {
    const success = await controller.deleteEvent(eventId, userId);
    if (!success) {
      return c.json({ error: 'Event not found or unauthorized' }, 404);
    }
    return c.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return c.json({ error: 'Failed to delete event' }, 500);
  }
});

// Get incomplete expired events (events before today that are not completed)
calendarEvents.get('/user/:userId/events/incomplete-expired', async (c) => {
  const userId = c.req.param('userId');

  const db = c.get('db');
  const controller = new CalendarEventController(db);

  try {
    const expiredEvents = await controller.getIncompleteExpiredEvents(userId);
    return c.json({
      data: expiredEvents,
      count: expiredEvents.length,
    });
  } catch (error) {
    console.error('Error fetching incomplete expired events:', error);
    return c.json({ error: 'Failed to fetch incomplete expired events' }, 500);
  }
});

// Group event routes
calendarEvents.get('/group/:groupId/events', async (c) => {
  const groupId = c.req.param('groupId');
  const page = Number.parseInt(c.req.query('page') || '1');
  const limit = Number.parseInt(c.req.query('limit') || '10');
  const sort = c.req.query('sort');
  const order = c.req.query('order') as 'asc' | 'desc' | undefined;
  const filter = c.req.query('filter');
  const startTime = c.req.query('startTime');
  const endTime = c.req.query('endTime');

  const db = c.get('db');
  const controller = new CalendarEventController(db);

  try {
    const response = await controller.getGroupEvents(
      groupId,
      page,
      limit,
      sort,
      order,
      filter,
      startTime,
      endTime,
    );
    return c.json(response);
  } catch (error) {
    console.error('Error fetching group events:', error);
    return c.json({ error: 'Failed to fetch group events' }, 500);
  }
});

calendarEvents.delete('/group/:groupId/events/:eventId', async (c) => {
  const eventId = Number.parseInt(c.req.param('eventId'));
  const groupId = c.req.param('groupId');

  const db = c.get('db');
  const controller = new CalendarEventController(db);

  try {
    const success = await controller.deleteGroupEvent(eventId, groupId);
    if (!success) {
      return c.json({ error: 'Event not found or unauthorized' }, 404);
    }
    return c.json({ message: 'Group event deleted successfully' });
  } catch (error) {
    console.error('Error deleting group event:', error);
    return c.json({ error: 'Failed to delete group event' }, 500);
  }
});

calendarEvents.patch('/group/:groupId/events/:eventId', async (c) => {
  const eventId = Number.parseInt(c.req.param('eventId'));
  const groupId = c.req.param('groupId');
  const eventData = await c.req.json();

  const db = c.get('db');
  const controller = new CalendarEventController(db);

  try {
    const updatedEvent = await controller.updateGroupEvent(eventId, groupId, eventData);
    if (!updatedEvent) {
      return c.json({ error: 'Event not found or unauthorized' }, 404);
    }
    return c.json(updatedEvent);
  } catch (error) {
    console.error('Error updating group event:', error);
    return c.json({ error: 'Failed to update group event' }, 500);
  }
});

export default calendarEvents;
