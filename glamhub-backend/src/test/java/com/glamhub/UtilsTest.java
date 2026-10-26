package com.glamhub;

import com.glamhub.util.Districts;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class UtilsTest {
    @Test
    void bangladeshHasSixtyFourDistrictsInEightDivisions() {
        assertEquals(64, Districts.ALL.size());
        assertEquals(8, Districts.BY_DIVISION.size());
    }

    @Test
    void districtValidationIsExact() {
        assertTrue(Districts.isValid("Dhaka"));
        assertTrue(Districts.isValid("Cox's Bazar"));
        assertFalse(Districts.isValid("dhaka"));
        assertFalse(Districts.isValid("Atlantis"));
        assertFalse(Districts.isValid(null));
    }
}
