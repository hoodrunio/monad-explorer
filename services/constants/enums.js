export const defaultEnums = {
	message_type: [
		"unknown",
		"send",
		"multisend",
		"create_vesting_account",
		"create_permanent_locked_account",
		"create_periodic_vesting_account",
	],
	msg_type: [
		"unknown",
		"MsgSend",
		"MsgMultiSend",
		"MsgCreateVestingAccount",
		"MsgCreatePermanentLockedAccount",
		"MsgCreatePeriodicVestingAccount",
	],
	status: ["success", "failed"],
	event_type: [
		"unknown",
		"transfer",
		"tx",
		"send_packet",
		"fungible_token_packet",
		"acknowledge_packet",
		"recv_packet",
		"write_acknowledgement",
		"timeout",
		"timeout_packet",
	],
	categories: [
		"uncategorized",
		"finance",
		"gaming",
		"nft",
		"social"
	],
	rollup_type: [
		"sovereign",
		"settled"
	],
	tags: [
		"ZK",
		"AI"
	]
}
