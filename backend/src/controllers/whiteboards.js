import Whiteboard from '../models/Whiteboard.js';
import Meeting from '../models/Meeting.js';
import { asyncHandler } from '../middleware/error.js';

export const get = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.meetingId);
  if (!m) return res.status(404).json({ message: 'Meeting not found' });

  let w = await Whiteboard.findOne({ meeting: m._id });
  if (!w) {
    w = await Whiteboard.create({
      meeting: m._id,
      pages: [{ name: 'Page 1', events: [] }],
      activePage: 'Page 1',
    });
  }
  res.json({ whiteboard: w });
});

export const addEvent = asyncHandler(async (req, res) => {
  const w = await Whiteboard.findOne({ meeting: req.params.meetingId });
  if (!w) return res.status(404).json({ message: 'Whiteboard not found' });

  const page = (req.body.pageId && w.pages.id(req.body.pageId)) || w.pages[0];
  if (!page) return res.status(400).json({ message: 'No active page' });

  page.events.push({
    type: req.body.type,
    payload: req.body.payload,
    actor: req.user._id,
  });
  await w.save();

  const event = page.events[page.events.length - 1];
  req.app.get('io').to(`meeting:${req.params.meetingId}`).emit('whiteboard:event', {
    pageId: page._id,
    event,
  });
  res.status(201).json({ event });
});

export const update = asyncHandler(async (req, res) => {
  const w = await Whiteboard.findOne({ meeting: req.params.meetingId });
  if (!w) return res.status(404).json({ message: 'Whiteboard not found' });
  if (req.body.editingMode) w.editingMode = req.body.editingMode;
  if (req.body.pages) w.pages = req.body.pages;
  await w.save();
  res.json({ whiteboard: w });
});