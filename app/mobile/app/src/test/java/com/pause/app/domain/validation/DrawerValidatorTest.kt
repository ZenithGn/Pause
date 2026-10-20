package com.pause.app.domain.validation

import com.pause.app.domain.model.DrawerValidationError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DrawerValidatorTest {

    @Test
    fun `drawer name is required and bounded`() {
        assertEquals(DrawerValidationError.NAME_REQUIRED, DrawerValidator.validateName("  "))
        assertEquals(
            DrawerValidationError.NAME_TOO_LONG,
            DrawerValidator.validateName("a".repeat(DrawerValidator.MAX_NAME_LENGTH + 1)),
        )
        assertNull(DrawerValidator.validateName("Đà Lạt 2026"))
        assertNull(DrawerValidator.validateName("a".repeat(DrawerValidator.MAX_NAME_LENGTH)))
    }

    @Test
    fun `description is optional but bounded`() {
        assertNull(DrawerValidator.validateDescription(null))
        assertNull(DrawerValidator.validateDescription(""))
        assertNull(DrawerValidator.validateDescription("Kỷ niệm chuyến đi"))
        assertEquals(
            DrawerValidationError.DESCRIPTION_TOO_LONG,
            DrawerValidator.validateDescription("a".repeat(DrawerValidator.MAX_DESCRIPTION_LENGTH + 1)),
        )
    }

    @Test
    fun `share email must be valid and not the owner`() {
        assertEquals(DrawerValidationError.EMAIL_REQUIRED, DrawerValidator.validateShareEmail("", null))
        assertEquals(
            DrawerValidationError.EMAIL_INVALID,
            DrawerValidator.validateShareEmail("not-an-email", null),
        )
        assertEquals(
            DrawerValidationError.SHARE_WITH_SELF,
            DrawerValidator.validateShareEmail("me@pause.app", "ME@pause.app"),
        )
        assertNull(DrawerValidator.validateShareEmail("friend@pause.app", "me@pause.app"))
    }
}
