<script setup>
import AwaitingModal from "./AwaitingModal.vue"
import ChartModal from "./ChartModal.vue"
import ConfirmationModal from "./ConfirmationModal.vue"
import ConstantsModal from "./ConstantsModal.vue"
import EditBookmarkAliasModal from "./EditBookmarkAliasModal.vue"
import ImportBookmarksModal from "./ImportBookmarksModal.vue"
import QRCodeModal from "./QRCodeModal.vue"
import RawDataModal from "./RawDataModal.vue"
import HexSettingsModal from "./HexSettingsModal.vue"
import APIModal from "./APIModal.vue"
import InputDecodeModal from "./InputDecodeModal.vue"
import TransactionResultModal from "./TransactionResultModal.vue"

/** Store */
import { useModalsStore } from "@/store/modals.store"
const modalsStore = useModalsStore()
</script>

<template>
	<AwaitingModal :show="modalsStore.modals.awaiting" @onClose="modalsStore.close('awaiting')" />
	<ConfirmationModal :show="modalsStore.modals.confirmation" @onClose="modalsStore.close('confirmation')" />
	<ConstantsModal :show="modalsStore.modals.constants" @onClose="modalsStore.close('constants')" />
	<EditBookmarkAliasModal :show="modalsStore.modals.edit_alias" @onClose="modalsStore.close('edit_alias')" />
	<ImportBookmarksModal :show="modalsStore.modals.import" @onClose="modalsStore.close('import')" />
	<QRCodeModal :show="modalsStore.modals.qr" @onClose="modalsStore.close('qr')" />
	<RawDataModal :show="modalsStore.modals.rawData" @onClose="modalsStore.close('rawData')" />
	<HexSettingsModal :show="modalsStore.modals.hexSettings" @onClose="modalsStore.close('hexSettings')" />
	<APIModal :show="modalsStore.modals.api" @onClose="modalsStore.close('api')" />
	<ChartModal :show="modalsStore.modals.chart" @onClose="modalsStore.close('chart')" />
	<InputDecodeModal :show="modalsStore.modals.inputDecode" @onClose="modalsStore.close('inputDecode')" />
	<TransactionResultModal :show="modalsStore.modals.transactionResult" :transaction="modalsStore.transactionData" @close="modalsStore.close('transactionResult')" />
</template>
