package com.glamhub.service;

import com.glamhub.dto.Dtos.*;
import com.glamhub.exception.ApiException;
import com.glamhub.model.Business.Availability;
import com.glamhub.model.Business.ServicePackage;
import com.glamhub.model.Enums.AvailabilityStatus;
import com.glamhub.model.User;
import com.glamhub.repository.Repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/** Packages and the availability calendar. */
@Service
@RequiredArgsConstructor
public class CatalogService {
    private final PackageRepository packages;
    private final AvailabilityRepository availability;
    private final BookingRepository bookings;

    public PackageDto toDto(ServicePackage p) {
        return new PackageDto(p.getId(), p.getTitle(), p.getDescription(), p.getPrice(), p.getDurationHours(), p.getIncludes());
    }

    public List<PackageDto> packagesOf(Long artistId) {
        return packages.findByArtistIdOrderByPriceAsc(artistId).stream().map(this::toDto).toList();
    }

    @Transactional
    public PackageDto createPackage(User artist, PackageRequest r) {
        return toDto(packages.save(ServicePackage.builder().artist(artist).title(r.title().trim()).description(r.description())
                .price(r.price()).durationHours(r.durationHours()).includes(r.includes()).build()));
    }

    @Transactional
    public PackageDto updatePackage(User artist, Long id, PackageRequest r) {
        ServicePackage p = owned(artist, id);
        p.setTitle(r.title().trim());
        p.setDescription(r.description());
        p.setPrice(r.price());
        p.setDurationHours(r.durationHours());
        p.setIncludes(r.includes());
        return toDto(packages.save(p));
    }

    @Transactional
    public void deletePackage(User artist, Long id) {
        ServicePackage p = owned(artist, id);
        boolean used = bookings.findByArtistId(artist.getId()).stream().anyMatch(b -> b.getServicePackage().getId().equals(id));
        if (used) throw ApiException.conflict("This package has bookings, so it can't be deleted. You can edit it instead.");
        packages.delete(p);
    }

    private ServicePackage owned(User artist, Long id) {
        ServicePackage p = packages.findById(id).orElseThrow(() -> ApiException.notFound("Package not found."));
        if (!p.getArtist().getId().equals(artist.getId())) throw ApiException.forbidden("That isn't your package.");
        return p;
    }

    // ---------- availability ----------
    public List<AvailabilityDto> calendar(Long artistId, LocalDate from, LocalDate to) {
        LocalDate f = from == null ? LocalDate.now() : from;
        LocalDate t = to == null ? f.plusMonths(3) : to;
        if (t.isBefore(f) || f.plusDays(400).isBefore(t)) throw ApiException.badRequest("Please choose a shorter date range.");
        return availability.findByArtistIdAndDateBetween(artistId, f, t).stream()
                .map(a -> new AvailabilityDto(a.getDate(), a.getStatus())).toList();
    }

    /** Artists can toggle a date between FREE and BLOCKED; booked and past dates are fixed. */
    @Transactional
    public AvailabilityDto setStatus(User artist, LocalDate date, AvailabilityStatus status) {
        if (date.isBefore(LocalDate.now())) throw ApiException.badRequest("You can't change a date in the past.");
        if (status == AvailabilityStatus.BOOKED) throw ApiException.badRequest("A date becomes booked only when a client books it.");
        Availability a = availability.findByArtistIdAndDate(artist.getId(), date).orElse(null);
        if (a != null && a.getStatus() == AvailabilityStatus.BOOKED) throw ApiException.conflict("That date already has a booking.");
        if (a == null) a = Availability.builder().artist(artist).date(date).status(status).build();
        else a.setStatus(status);
        availability.save(a);
        return new AvailabilityDto(date, status);
    }
}
