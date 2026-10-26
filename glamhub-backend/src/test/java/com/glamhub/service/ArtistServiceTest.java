package com.glamhub.service;

import com.glamhub.repository.Repositories.*;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ArtistServiceTest {
    private final ArtistProfileRepository profiles = mock(ArtistProfileRepository.class);
    private final ArtistService service = new ArtistService(profiles, mock(UserRepository.class), mock(PackageRepository.class));

    @Test
    void unknownBudgetOrCategoryMatchesNothingInsteadOfFailing() {
        assertEquals(0, service.search("", "", "PLATINUM", "", 0, 12).total());
        assertEquals(0, service.search("", "", "", "wedding", 0, 12).total());
        verifyNoInteractions(profiles);
    }
}
