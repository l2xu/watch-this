onRecordAfterUpdateSuccess((e) => {
	const rec = e.record;
	const original = e.record.original(); // state before update

	const senderId = rec.get("sender");

	// Helper: create a notification if one doesn't already exist
	function maybeCreateNotification(type) {
		let existing = null;
		try {
			existing = $app.findFirstRecordByFilter(
				"notifications",
				`recommendation = "${rec.id}" && type = "${type}"`,
			);
		} catch (_) {
			// findFirstRecordByFilter throws when no record is found
		}
		if (existing) return; // deduplicate

		const collection = $app.findCollectionByNameOrId("notifications");
		const notification = new Record(collection);
		notification.set("recipient", senderId);
		notification.set("type", type);
		notification.set("recommendation", rec.id);
		notification.set("read", false);
		$app.save(notification);
	}

	// Helper: delete existing notification for a given type (used on reaction change)
	function maybeDeleteNotification(type) {
		let existing = null;
		try {
			existing = $app.findFirstRecordByFilter(
				"notifications",
				`recommendation = "${rec.id}" && type = "${type}"`,
			);
		} catch (_) {
			// no record found — nothing to delete
		}
		if (existing) {
			$app.delete(existing);
		}
	}

	// seen: false → true
	if (!original.get("seen") && rec.get("seen")) {
		maybeCreateNotification("seen");
	}

	const prevReaction = original.get("reaction");
	const newReaction = rec.get("reaction");

	// reaction changed
	if (prevReaction !== newReaction) {
		// Remove old notification if reaction changed from a previous value
		if (prevReaction === "like") {
			maybeDeleteNotification("liked");
		} else if (prevReaction === "dislike") {
			maybeDeleteNotification("disliked");
		}

		if (newReaction === "like") {
			maybeCreateNotification("liked");
		} else if (newReaction === "dislike") {
			maybeCreateNotification("disliked");
		}
	}
}, "link_recommendations");
