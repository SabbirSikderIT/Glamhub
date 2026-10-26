package com.glamhub.model;

import com.glamhub.model.Enums.BudgetTier;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "artist_profiles")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ArtistProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    /** District used by search. */
    private String baseLocation;

    @Builder.Default
    private int yearsExperience = 0;

    /** LOW / MEDIUM / HIGH budget, chosen by the artist. */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BudgetTier budgetTier = BudgetTier.MEDIUM;

    @Builder.Default
    private double ratingAvg = 0;

    @Builder.Default
    private int totalReviews = 0;

    /** Denormalised so the hot search query can sort on it. */
    @Builder.Default
    private boolean hasBlueBadge = false;
}
