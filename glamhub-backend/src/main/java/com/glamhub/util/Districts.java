package com.glamhub.util;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** The 64 districts of Bangladesh, grouped by division. */
public final class Districts {
    private Districts() {}

    public static final Map<String, List<String>> BY_DIVISION = new LinkedHashMap<>();
    static {
        BY_DIVISION.put("Dhaka", List.of("Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj",
                "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"));
        BY_DIVISION.put("Chattogram", List.of("Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar",
                "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"));
        BY_DIVISION.put("Rajshahi", List.of("Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Rajshahi", "Sirajganj"));
        BY_DIVISION.put("Khulna", List.of("Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"));
        BY_DIVISION.put("Barishal", List.of("Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"));
        BY_DIVISION.put("Sylhet", List.of("Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"));
        BY_DIVISION.put("Rangpur", List.of("Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"));
        BY_DIVISION.put("Mymensingh", List.of("Jamalpur", "Mymensingh", "Netrokona", "Sherpur"));
    }

    public static final Set<String> ALL = BY_DIVISION.values().stream().flatMap(List::stream).collect(Collectors.toSet());

    public static boolean isValid(String d) { return d != null && ALL.contains(d); }
}
