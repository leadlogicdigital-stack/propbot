#!/usr/bin/env python3
"""
Property Valuation Engine - India (Bangalore & Mysore)
Concentric Circles Model with Government Guidance Values
"""

import math
import json
from datetime import datetime
from typing import Dict, Tuple, Optional

# ============================================================================
# GOVERNMENT GUIDANCE VALUES
# ============================================================================

MYSORE_WEST_GUIDANCE = {
    "yogakshema_housing_coop": 7000,
    "nithyanandasagara_telecom": 7000,
    "silver_springs": 11000,
    "bharathi_enclave": 12000,
    "bharathi_monarch": 10000,
    "royal_enclave": 8500,
    "sky_top_green_city": 7500,
    "spoorthy_sunshine": 8500,
    "mysore_west_average": 9187  # Fallback average
}

# City Center Coordinates
CITY_CENTERS = {
    "bangalore": {
        "name": "MG Road / Brigade Road (CBD)",
        "latitude": 12.9716,
        "longitude": 77.6412,
        "base_price_apartment": 11750,  # ₹ per sq.ft for 2BHK
        "base_price_plot": 1140000,  # ₹ for 2400 sq.ft
        "base_price_villa": 6000000,  # ₹ for 2 acre
        "base_price_commercial": 160,  # ₹ per sq.ft per month rental
        "base_price_agricultural": 2750000  # ₹ per acre
    },
    "mysore": {
        "name": "Devaraja Market / Sayyaji Rao Rd (CBD)",
        "latitude": 12.3099,
        "longitude": 76.6474,
        "base_price_apartment": 9187,  # ₹ per sq.ft (using Mysore West avg)
        "base_price_plot": 385000,  # ₹ for 2400 sq.ft
        "base_price_villa": 1600000,  # ₹ for 2 acre
        "base_price_commercial": 40,  # ₹ per sq.ft per month rental
        "base_price_agricultural": 2000000  # ₹ per acre
    }
}

# ============================================================================
# DISTANCE MULTIPLIERS BY CONCENTRIC CIRCLES
# ============================================================================

def get_distance_multiplier(distance_km: float) -> float:
    """
    Calculate distance multiplier based on concentric circles model

    Circle 1: 0-2 km (Multiplier: 1.0)
    Circle 2: 2-5 km (Multiplier: 0.75)
    Circle 3: 5-10 km (Multiplier: 0.60)
    Circle 4: 10-15 km (Multiplier: 0.45)
    Circle 5: 15-25 km (Multiplier: 0.25)

    Linear interpolation between circles for precise distances
    """
    if distance_km <= 2:
        return 1.0
    elif distance_km <= 5:
        # Circle 2: Linear decline from 1.0 to 0.75
        position = (distance_km - 2) / 3
        return 1.0 - (position * 0.25)
    elif distance_km <= 10:
        # Circle 3: Linear decline from 0.75 to 0.60
        position = (distance_km - 5) / 5
        return 0.75 - (position * 0.15)
    elif distance_km <= 15:
        # Circle 4: Linear decline from 0.60 to 0.45
        position = (distance_km - 10) / 5
        return 0.60 - (position * 0.15)
    elif distance_km <= 25:
        # Circle 5: Linear decline from 0.45 to 0.25
        position = (distance_km - 15) / 10
        return 0.45 - (position * 0.20)
    else:
        return 0.25  # Beyond 25 km

def get_circle_number(distance_km: float) -> int:
    """Get concentric circle number (1-5) based on distance"""
    if distance_km <= 2:
        return 1
    elif distance_km <= 5:
        return 2
    elif distance_km <= 10:
        return 3
    elif distance_km <= 15:
        return 4
    else:
        return 5

# ============================================================================
# ADJUSTMENT FACTORS
# ============================================================================

class PropertyAdjustments:
    """Calculate adjustment factors for different property characteristics"""

    @staticmethod
    def apartment_adjustments(
        bedrooms: int = 2,
        age_years: int = 5,
        furnishing: str = "unfurnished"
    ) -> Dict[str, float]:
        """Calculate apartment price adjustments"""

        bedroom_factors = {1: 0.75, 2: 1.0, 3: 1.25, 4: 1.50}
        bedroom_factor = bedroom_factors.get(bedrooms, 1.0)

        if age_years <= 5:
            age_factor = 1.0
        elif age_years <= 10:
            age_factor = 0.95
        elif age_years <= 15:
            age_factor = 0.90
        elif age_years <= 20:
            age_factor = 0.80
        else:
            age_factor = 0.70

        furnishing_factors = {
            "unfurnished": 1.0,
            "semi_furnished": 1.12,
            "fully_furnished": 1.20
        }
        furnishing_factor = furnishing_factors.get(furnishing, 1.0)

        return {
            "bedroom": bedroom_factor,
            "age": age_factor,
            "furnishing": furnishing_factor,
            "combined": bedroom_factor * age_factor * furnishing_factor
        }

    @staticmethod
    def plot_adjustments(
        size_sqft: float = 2400,
        road_facing: str = "inner_road",
        corner_plot: bool = False
    ) -> Dict[str, float]:
        """Calculate plot price adjustments"""

        standard_size = 2400
        size_multiplier = size_sqft / standard_size

        road_premium = 1.08 if road_facing == "main_road" else 1.0
        corner_premium = 1.05 if corner_plot else 1.0

        return {
            "size": size_multiplier,
            "road": road_premium,
            "corner": corner_premium,
            "combined": size_multiplier * road_premium * corner_premium
        }

    @staticmethod
    def villa_adjustments(
        acres: float = 2,
        amenities: list = None
    ) -> Dict[str, float]:
        """Calculate villa price adjustments"""

        if amenities is None:
            amenities = []

        # Non-linear size adjustment
        size_multiplier = (acres / 2) ** 0.9 if acres != 2 else 1.0

        amenity_multiplier = 1.0
        if "pool" in amenities:
            amenity_multiplier *= 1.08
        if "gym" in amenities:
            amenity_multiplier *= 1.05
        if "gated" in amenities:
            amenity_multiplier *= 1.10
        if "private_garden" in amenities:
            amenity_multiplier *= 1.06

        return {
            "size": size_multiplier,
            "amenities": amenity_multiplier,
            "combined": size_multiplier * amenity_multiplier
        }

    @staticmethod
    def agricultural_adjustments(
        acres: float = 1,
        water_access: str = "garden",
        development_potential: str = "low"
    ) -> Dict[str, float]:
        """Calculate agricultural land price adjustments"""

        size_multiplier = (acres) ** 0.85 if acres != 1 else 1.0

        water_multipliers = {"dry": 0.80, "garden": 1.0, "wet": 1.30}
        water_multiplier = water_multipliers.get(water_access, 1.0)

        dev_multipliers = {"low": 1.0, "medium": 1.25, "high": 1.60}
        dev_multiplier = dev_multipliers.get(development_potential, 1.0)

        return {
            "size": size_multiplier,
            "water": water_multiplier,
            "development": dev_multiplier,
            "combined": size_multiplier * water_multiplier * dev_multiplier
        }

# ============================================================================
# VALUATION FUNCTIONS
# ============================================================================

class PropertyValuator:
    """Main property valuation engine"""

    @staticmethod
    def haversine_distance(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """Calculate distance between two coordinates in km"""

        R = 6371  # Earth radius in km

        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = (math.sin(dlat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))

        return R * c

    @staticmethod
    def valuate_apartment(
        city: str,
        sqft: float,
        distance_km: float,
        bedrooms: int = 2,
        age_years: int = 5,
        furnishing: str = "unfurnished",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None
    ) -> Dict:
        """
        Valuate an apartment property

        Args:
            city: "bangalore" or "mysore"
            sqft: Property size in square feet
            distance_km: Distance from city center in km
            bedrooms: Number of bedrooms (1-4)
            age_years: Age of building
            furnishing: "unfurnished", "semi_furnished", "fully_furnished"
            latitude, longitude: Exact coordinates (optional, overrides distance_km)

        Returns:
            Dictionary with valuation details
        """

        if city not in CITY_CENTERS:
            raise ValueError(f"City {city} not supported")

        # Calculate distance if coordinates provided
        if latitude and longitude:
            cbd = CITY_CENTERS[city]
            distance_km = PropertyValuator.haversine_distance(
                cbd["latitude"], cbd["longitude"],
                latitude, longitude
            )

        cbd = CITY_CENTERS[city]
        base_price = cbd["base_price_apartment"]

        # Get adjustments
        adjustments = PropertyAdjustments.apartment_adjustments(
            bedrooms, age_years, furnishing
        )

        # Calculate distance multiplier
        distance_mult = get_distance_multiplier(distance_km)

        # Calculate final price per sq.ft
        price_per_sqft = (
            base_price *
            distance_mult *
            adjustments["combined"]
        )

        # Total value
        total_value = price_per_sqft * sqft

        return {
            "property_type": "apartment",
            "city": city,
            "size_sqft": sqft,
            "distance_km": round(distance_km, 2),
            "circle": get_circle_number(distance_km),
            "bedrooms": bedrooms,
            "age_years": age_years,
            "furnishing": furnishing,
            "price_per_sqft": round(price_per_sqft),
            "estimate_min": round(total_value * 0.9),
            "estimate_max": round(total_value * 1.1),
            "estimate_mid": round(total_value),
            "confidence": "75-80%",
            "breakdown": {
                "base_price": base_price,
                "distance_multiplier": round(distance_mult, 2),
                "bedroom_factor": adjustments["bedroom"],
                "age_factor": adjustments["age"],
                "furnishing_factor": adjustments["furnishing"]
            }
        }

    @staticmethod
    def valuate_plot(
        city: str,
        sqft: float,
        distance_km: float,
        road_facing: str = "inner_road",
        corner_plot: bool = False,
        area_name: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None
    ) -> Dict:
        """
        Valuate a plot/site property

        Args:
            city: "bangalore" or "mysore"
            sqft: Plot size in square feet
            distance_km: Distance from city center
            road_facing: "main_road" or "inner_road"
            corner_plot: Whether it's a corner plot
            area_name: Specific area name (for Mysore West lookup)
            latitude, longitude: Exact coordinates

        Returns:
            Dictionary with valuation details
        """

        if city not in CITY_CENTERS:
            raise ValueError(f"City {city} not supported")

        # Calculate distance if coordinates provided
        if latitude and longitude:
            cbd = CITY_CENTERS[city]
            distance_km = PropertyValuator.haversine_distance(
                cbd["latitude"], cbd["longitude"],
                latitude, longitude
            )

        cbd = CITY_CENTERS[city]
        base_price = cbd["base_price_plot"]
        standard_size = 2400

        # Check if area has specific guidance value
        if city == "mysore" and area_name:
            area_key = area_name.lower().replace(" ", "_")
            if area_key in MYSORE_WEST_GUIDANCE:
                guidance_value = MYSORE_WEST_GUIDANCE[area_key]
                base_price = guidance_value * standard_size

        # Get adjustments
        adjustments = PropertyAdjustments.plot_adjustments(
            sqft, road_facing, corner_plot
        )

        # Distance multiplier
        distance_mult = get_distance_multiplier(distance_km)

        # Calculate total value
        total_value = (
            base_price *
            distance_mult *
            adjustments["combined"]
        )

        return {
            "property_type": "plot",
            "city": city,
            "size_sqft": sqft,
            "distance_km": round(distance_km, 2),
            "circle": get_circle_number(distance_km),
            "road_facing": road_facing,
            "corner_plot": corner_plot,
            "area_name": area_name,
            "estimate_min": round(total_value * 0.9),
            "estimate_max": round(total_value * 1.1),
            "estimate_mid": round(total_value),
            "price_per_sqft": round(total_value / sqft),
            "confidence": "70-75%",
            "breakdown": {
                "base_price": base_price,
                "distance_multiplier": round(distance_mult, 2),
                "size_multiplier": adjustments["size"],
                "road_premium": adjustments["road"],
                "corner_premium": adjustments["corner"]
            }
        }

    @staticmethod
    def valuate_villa(
        city: str,
        acres: float,
        distance_km: float,
        amenities: list = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None
    ) -> Dict:
        """Valuate a villa property"""

        if amenities is None:
            amenities = []

        if city not in CITY_CENTERS:
            raise ValueError(f"City {city} not supported")

        if latitude and longitude:
            cbd = CITY_CENTERS[city]
            distance_km = PropertyValuator.haversine_distance(
                cbd["latitude"], cbd["longitude"],
                latitude, longitude
            )

        cbd = CITY_CENTERS[city]
        base_price = cbd["base_price_villa"]

        adjustments = PropertyAdjustments.villa_adjustments(acres, amenities)
        distance_mult = get_distance_multiplier(distance_km)

        total_value = (
            base_price *
            distance_mult *
            adjustments["combined"]
        )

        return {
            "property_type": "villa",
            "city": city,
            "acres": acres,
            "distance_km": round(distance_km, 2),
            "circle": get_circle_number(distance_km),
            "amenities": amenities,
            "estimate_min": round(total_value * 0.85),
            "estimate_max": round(total_value * 1.15),
            "estimate_mid": round(total_value),
            "price_per_acre": round(total_value / acres),
            "confidence": "65-70%",
            "breakdown": {
                "base_price": base_price,
                "distance_multiplier": round(distance_mult, 2),
                "size_multiplier": adjustments["size"],
                "amenity_multiplier": adjustments["amenities"]
            }
        }

    @staticmethod
    def valuate_agricultural(
        city: str,
        acres: float,
        distance_km: float,
        water_access: str = "garden",
        development_potential: str = "low",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None
    ) -> Dict:
        """Valuate agricultural land"""

        if city not in CITY_CENTERS:
            raise ValueError(f"City {city} not supported")

        if latitude and longitude:
            cbd = CITY_CENTERS[city]
            distance_km = PropertyValuator.haversine_distance(
                cbd["latitude"], cbd["longitude"],
                latitude, longitude
            )

        cbd = CITY_CENTERS[city]
        base_price = cbd["base_price_agricultural"]

        adjustments = PropertyAdjustments.agricultural_adjustments(
            acres, water_access, development_potential
        )
        distance_mult = get_distance_multiplier(distance_km)

        price_per_acre = (
            base_price *
            distance_mult *
            adjustments["combined"]
        )

        total_value = price_per_acre * acres

        return {
            "property_type": "agricultural",
            "city": city,
            "acres": acres,
            "distance_km": round(distance_km, 2),
            "circle": get_circle_number(distance_km),
            "water_access": water_access,
            "development_potential": development_potential,
            "price_per_acre": round(price_per_acre),
            "estimate_min": round(total_value * 0.90),
            "estimate_max": round(total_value * 1.10),
            "estimate_mid": round(total_value),
            "confidence": "60-65%",
            "breakdown": {
                "base_price": base_price,
                "distance_multiplier": round(distance_mult, 2),
                "size_multiplier": adjustments["size"],
                "water_multiplier": adjustments["water"],
                "development_multiplier": adjustments["development"]
            }
        }

# ============================================================================
# MAIN EXECUTION (For Testing)
# ============================================================================

if __name__ == "__main__":
    # Example 1: Bangalore 2BHK Apartment
    print("="*70)
    print("EXAMPLE 1: Bangalore 2BHK Apartment in Whitefield")
    print("="*70)
    result = PropertyValuator.valuate_apartment(
        city="bangalore",
        sqft=1000,
        distance_km=7,
        bedrooms=2,
        age_years=3,
        furnishing="unfurnished"
    )
    print(json.dumps(result, indent=2))

    # Example 2: Mysore Plot in Bharathi Enclave
    print("\n" + "="*70)
    print("EXAMPLE 2: Mysore Plot - Bharathi Enclave")
    print("="*70)
    result = PropertyValuator.valuate_plot(
        city="mysore",
        sqft=2400,
        distance_km=2.5,
        road_facing="main_road",
        corner_plot=True,
        area_name="Bharathi Enclave"
    )
    print(json.dumps(result, indent=2))

    # Example 3: Mysore Villa
    print("\n" + "="*70)
    print("EXAMPLE 3: Mysore Villa")
    print("="*70)
    result = PropertyValuator.valuate_villa(
        city="mysore",
        acres=2,
        distance_km=5,
        amenities=["pool", "gated", "private_garden"]
    )
    print(json.dumps(result, indent=2))
