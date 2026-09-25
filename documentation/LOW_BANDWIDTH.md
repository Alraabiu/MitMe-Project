# Low-bandwidth strategy

MitMe's meeting layer separates signaling from media so a production deployment can use an SFU that dynamically adapts simulcast layers. The client should default to audio when network quality is poor, reduce camera resolution, and pause video for inactive tiles. Realtime chat and whiteboard events are compact JSON events; production should batch high-frequency pointer events and use backpressure.
