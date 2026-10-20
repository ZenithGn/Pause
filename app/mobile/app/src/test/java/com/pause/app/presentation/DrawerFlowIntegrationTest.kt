package com.pause.app.presentation

import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.model.ShareRecipient
import com.pause.app.domain.repository.RawPhoto
import com.pause.app.domain.usecase.CreateDrawerUseCase
import com.pause.app.domain.usecase.DeleteDrawerUseCase
import com.pause.app.domain.usecase.DeletePhotosUseCase
import com.pause.app.domain.usecase.GetCurrentSessionUseCase
import com.pause.app.domain.usecase.GetDrawerSharesUseCase
import com.pause.app.domain.usecase.GetDrawerUseCase
import com.pause.app.domain.usecase.GetShareInvitationsUseCase
import com.pause.app.domain.usecase.GetDrawersUseCase
import com.pause.app.domain.usecase.GetPhotoUrlsUseCase
import com.pause.app.domain.usecase.GetPhotosUseCase
import com.pause.app.domain.usecase.RespondShareInvitationUseCase
import com.pause.app.domain.usecase.RevokeShareUseCase
import com.pause.app.domain.usecase.ShareDrawerUseCase
import com.pause.app.domain.usecase.UpdateDrawerUseCase
import com.pause.app.domain.usecase.UploadPhotosUseCase
import com.pause.app.presentation.drawer.DrawerDetailViewModel
import com.pause.app.presentation.drawer.DrawerListViewModel
import com.pause.app.presentation.share.ShareDrawerViewModel
import com.pause.app.testutil.FakeAuthRepository
import com.pause.app.testutil.FakeData
import com.pause.app.testutil.FakeDrawerRepository
import com.pause.app.testutil.FakePhotoProcessor
import com.pause.app.testutil.FakePhotoRepository
import com.pause.app.testutil.FakeProfileRepository
import com.pause.app.testutil.FakeShareRepository
import com.pause.app.testutil.MainDispatcherRule
import com.pause.app.testutil.testDrawer
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/**
 * Integration test for the whole FR-02 flow: list → create (quota) → detail →
 * upload → multi-select delete → edit → share → revoke → delete drawer.
 * Runs against in-memory repositories, no device / network required.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class DrawerFlowIntegrationTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val drawers = FakeDrawerRepository()
    private val photos = FakePhotoRepository()
    private val shares = FakeShareRepository()
    private val processor = FakePhotoProcessor()
    private val profiles = FakeProfileRepository()
    private val auth = FakeAuthRepository().apply { sessionState.value = FakeData.session() }
    private val getSession = GetCurrentSessionUseCase(auth)

    private fun listViewModel() = DrawerListViewModel(
        getDrawersUseCase = GetDrawersUseCase(drawers),
        createDrawerUseCase = CreateDrawerUseCase(drawers, profiles, getSession),
        getShareInvitationsUseCase = GetShareInvitationsUseCase(shares),
        respondShareInvitationUseCase = RespondShareInvitationUseCase(shares),
    )

    private fun detailViewModel(drawerId: String) = DrawerDetailViewModel(
        drawerId = drawerId,
        getDrawerUseCase = GetDrawerUseCase(drawers),
        getPhotosUseCase = GetPhotosUseCase(photos),
        getPhotoUrlsUseCase = GetPhotoUrlsUseCase(photos),
        uploadPhotosUseCase = UploadPhotosUseCase(photos, processor),
        deletePhotosUseCase = DeletePhotosUseCase(photos),
        updateDrawerUseCase = UpdateDrawerUseCase(drawers),
        deleteDrawerUseCase = DeleteDrawerUseCase(drawers),
    )

    private fun shareViewModel(drawerId: String) = ShareDrawerViewModel(
        drawerId = drawerId,
        getDrawerUseCase = GetDrawerUseCase(drawers),
        getDrawerSharesUseCase = GetDrawerSharesUseCase(shares),
        shareDrawerUseCase = ShareDrawerUseCase(shares, getSession),
        revokeShareUseCase = RevokeShareUseCase(shares),
    )

    private fun rawPhotos(count: Int) = List(count) {
        RawPhoto(bytes = ByteArray(2048), mimeType = "image/jpeg")
    }

    @Test
    fun `create upload delete share and remove a drawer`() = runTest {
        drawers.drawers += testDrawer(id = "drawer-1", name = "Đà Lạt 2026")

        // FR-02.1 – list
        val list = listViewModel()
        list.load()
        assertEquals(1, list.state.value.owned.size)
        assertFalse(list.state.value.isEmpty)

        // FR-02.2 – create two more drawers, then hit the free-tier quota
        list.openCreateSheet()
        list.onNameChange("Sinh nhật")
        list.createDrawer()
        assertEquals(2, list.state.value.owned.size)
        assertFalse(list.state.value.isCreateSheetOpen)
        assertNotNull(list.state.value.toast)

        list.openCreateSheet()
        list.onNameChange("Ngăn kéo 3")
        list.createDrawer()
        assertEquals(3, list.state.value.owned.size)

        list.openCreateSheet()
        list.onNameChange("Ngăn kéo 4")
        list.createDrawer()
        assertEquals(3, list.state.value.owned.size)
        assertEquals(3, list.state.value.quotaReachedMaxDrawers)

        val created = drawers.drawers.last()

        // FR-02.5/FR-02.6 – detail + upload
        val detail = detailViewModel(created.id)
        detail.load()
        assertEquals(created.name, detail.state.value.drawer?.name)
        assertTrue(detail.state.value.photos.isEmpty())

        detail.upload(rawPhotos(2))
        assertEquals(2, detail.state.value.photos.size)
        assertEquals(2, photos.photos.size)
        assertTrue(detail.state.value.thumbnailUrls.isNotEmpty())
        assertFalse(detail.state.value.isUploading)

        // FR-02.6 – multi-select delete
        val firstPhoto = detail.state.value.photos.first()
        detail.toggleSelection(firstPhoto.id)
        assertEquals(1, detail.state.value.selectionCount)
        detail.deleteSelected()
        assertEquals(1, detail.state.value.photos.size)
        assertFalse(detail.state.value.isSelectionMode)

        // FR-02.3 – rename
        detail.updateDrawer("Sinh nhật mới", "Kỷ niệm")
        assertEquals("Sinh nhật mới", detail.state.value.drawer?.name)

        // FR-02.7 – share + revoke
        shares.recipients["friend@pause.app"] = ShareRecipient("friend-id", "friend@pause.app", "Bạn")
        val shareVm = shareViewModel(created.id)
        shareVm.load()
        shareVm.onEmailChange("friend@pause.app")
        shareVm.onPermissionChange(SharePermission.EDIT)
        shareVm.submit()
        assertEquals(1, shareVm.state.value.shares.size)
        assertEquals(SharePermission.EDIT, shareVm.state.value.shares.single().permission)

        shareVm.revoke(shareVm.state.value.shares.single())
        assertTrue(shareVm.state.value.shares.isEmpty())

        // FR-02.4 – delete (owner only)
        detail.deleteDrawer()
        assertTrue(detail.state.value.deleted)
        assertEquals(listOf(created.id), drawers.deletedDrawerIds)
        assertTrue(drawers.drawers.none { it.id == created.id })
    }

    @Test
    fun `read-only shared drawer cannot be modified`() = runTest {
        drawers.drawers += testDrawer(
            id = "shared-1",
            ownerId = "owner-2",
            ownerName = "Alice",
            isOwner = false,
            permission = SharePermission.VIEW,
        )
        val detail = detailViewModel("shared-1")
        detail.load()

        assertFalse(detail.state.value.canWrite)
        detail.upload(rawPhotos(1))
        assertTrue(photos.photos.isEmpty())

        detail.updateDrawer("Hack", null)
        assertEquals("Đà Lạt 2026", drawers.drawers.single().name)

        detail.deleteDrawer()
        assertFalse(detail.state.value.deleted)
    }
}
