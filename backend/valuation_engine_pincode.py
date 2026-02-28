#!/usr/bin/env python3
"""
Property Valuation Engine - India (Bangalore & Mysore)
PIN Code-Based Model with Government Guidance Values
Version 2.0 - Rewritten for PIN code-based accuracy
"""

import math
import json
import os
from datetime import datetime
from typing import Dict, Tuple, Optional, List

# ============================================================================
# LOAD PIN CODE DATABASE
# ============================================================================

def load_pincode_database():
    """Load PIN code database from JSON file"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'PINCODE_GUIDANCE_DATABASE.json')
    try:
        with open(db_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"PIN code database not found at {db_path}")
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON in PIN code database at {db_path}")

PINCODE_DB = load_pincode_database()

# ============================================================================
# PIN CODE VALIDATION & LOOKUP
# ============================================================================

def validate_pincode(pin_code: str) -> bool:
    """Validate if PIN code exists in database"""
    pin_code = str(pin_code).strip()

    # Check in bangalore (dict with PIN codes as keys)
    if pin_code in PINCODE_DB.get("bangalore", {}):
        return True

    # Check in bangalore_periphery
    if pin_code in PINCODE_DB.get("bangalore_periphery", {}):
        return True

    # Check in mysore
    if pin_code in PINCODE_DB.get("mysore", {}):
        return True

    # Check in mysore_periphery
    if pin_code in PINCODE_DB.get("mysore_periphery", {}):
        return True

    return False

def get_pincode_data(pin_code: str) -> Optional[Dict]:
    """
    Get PIN code data from database

    Args:
        pin_code: 6-digit PIN code string

    Returns:
        Dictionary with PIN code data or None if not found
    """
    pin_code = str(pin_code).strip()

    # Check in bangalore (dict with PIN codes as keys)
    if pin_code in PINCODE_DB.get("bangalore", {}):
        return PINCODE_DB["bangalore"][pin_code]

    # Check in bangalore_periphery
    if pin_code in PINCODE_DB.get("bangalore_periphery", {}):
        return PINCODE_DB["bangalore_periphery"][pin_code]

    # Check in mysore
    if pin_code in PINCODE_DB.get("mysore", {}):
        return PINCODE_DB["mysore"][pin_code]

    # Check in mysore_periphery
    if pin_code in PINCODE_DB.get("mysore_periphery", {}):
        return PINCODE_DB["mysore_periphery"][pin_code]

    return None

def get_pincode_city(pin_code: str) -> Optional[str]:
    """Determine city from PIN code"""
    pincode_data = get_pincode_data(pin_code)
    if pincode_data:
        return pincode_data.get("city")

    # Infer from PIN code prefix
    pin_str = str(pin_code).strip()
    if pin_str.startswith("560") or pin_str.startswith("562") or pin_str.startswith("561"):
        return "bangalore"
    elif pin_str.startswith("570"):
        return "mysore"

    return None

# ============================================================================
# DISTANCE-BASED MULTIPLIERS (WITHIN PIN CODE)
# ============================================================================

def get_intra_pincode_distance_multiplier(distance_km: float) -> float:
    """
    Get distance multiplier for properties within same PIN code

    Different from city-wide circles - applies only within PIN code area

    0-2 km:    1.0x (premium location within PIN code)
    2-5 km:    0.9x (good connectivity within PIN code)
    5-10 km:   0.8x (developing areas within PIN code)
    10+ km:    0.7x (periphery within same PIN code)
    """
    if distance_km <= 2:
        return 1.0
    elif distance_km <= 5:
        position = (distance_km - 2) / 3
        return 1.0 - (position * 0.1)
    elif distance_km <= 10:
        position = (distance_km - 5) / 5
        return 0.9 - (position * 0.1)
    else:
        return 0.7

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
        corner_premium = 1.15 if corner_plot else 1.0

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
# VALUATION FUNCTIONS - PIN CODE BASED
# ============================================================================

class PropertyValuator:
    """Main property valuation engine (PIN code-based)"""

    @staticmethod
    def valuate_apartment(
        pin_code: str,
        sqft: float,
        bedrooms: int = 2,
        age_years: int = 5,
        furnishing: str = "unfurnished",
        distance_km: float = 2.0
    ) -> Dict:
        """
        Valuate an apartment using PIN code-based model

        Args:
            pin_code: 6-digit PIN code
            sqft: Property size in square feet
            bedrooms: Number of bedrooms (default 2)
            age_years: Age of property in years (default 5)
            furnishing: "unfurnished", "semi_furnished", "fully_furnished"
            distance_km: Distance within PIN code area (0-10km typical)

        Returns:
            Dictionary with valuation estimate and breakdown
        """

        if not validate_pincode(pin_code):
            raise ValueError(f"Invalid PIN code: {pin_code}")

        pin_data = get_pincode_data(pin_code)
        if not pin_data or "apartment" not in pin_data.get("properties", {}):
            raise ValueError(f"No apartment data for PIN code: {pin_code}")

        apt_data = pin_data["properties"]["apartment"]

        # Determine base prices: prefer market prices if available, else use guidance values
        market_multiplier = apt_data.get("marketMultiplier", 1.0)

        if "marketMin" in apt_data and "marketMax" in apt_data:
            # Use actual market prices as base
            base_price_min = apt_data.get("marketMin", 0)
            base_price_max = apt_data.get("marketMax", 0)
        else:
            # Fall back to guidance values with multiplier
            guidance_obj = pin_data.get("guidanceValue", {})
            guidance_min = guidance_obj.get("min", apt_data.get("guidanceMin", apt_data.get("min", 0)))
            guidance_max = guidance_obj.get("max", apt_data.get("guidanceMax", apt_data.get("max", 0)))
            base_price_min = guidance_min * market_multiplier
            base_price_max = guidance_max * market_multiplier

        if not base_price_min or not base_price_max:
            raise ValueError(f"Invalid price values for PIN code {pin_code}. Apt: {apt_data}")

        base_price_mid = (base_price_min + base_price_max) / 2

        # Get adjustments
        adjustments = PropertyAdjustments.apartment_adjustments(bedrooms, age_years, furnishing)
        distance_mult = get_intra_pincode_distance_multiplier(distance_km)

        # Calculate price per sqft
        price_per_sqft_min = base_price_min * distance_mult * adjustments["combined"]
        price_per_sqft_max = base_price_max * distance_mult * adjustments["combined"]
        price_per_sqft_mid = base_price_mid * distance_mult * adjustments["combined"]

        # Calculate total value
        estimate_min = round(price_per_sqft_min * sqft)
        estimate_max = round(price_per_sqft_max * sqft)
        estimate_mid = round(price_per_sqft_mid * sqft)

        return {
            "property_type": "apartment",
            "pin_code": pin_code,
            "locality": pin_data.get("locality", ""),
            "city": pin_data.get("city", ""),
            "tier": pin_data.get("tier", ""),
            "sqft": sqft,
            "bedrooms": bedrooms,
            "estimate_min": estimate_min,
            "estimate_max": estimate_max,
            "estimate_mid": estimate_mid,
            "price_per_sqft": round(price_per_sqft_mid),
            "confidence": "80-85%",
            "breakdown": {
                "base_price_min": round(base_price_min),
                "base_price_max": round(base_price_max),
                "market_multiplier": round(market_multiplier, 2),
                "distance_km": distance_km,
                "distance_multiplier": round(distance_mult, 2),
                "bedrooms_adjustment": round(adjustments["bedroom"], 2),
                "age_adjustment": round(adjustments["age"], 2),
                "furnishing_adjustment": round(adjustments["furnishing"], 2),
                "price_per_sqft_min": round(price_per_sqft_min),
                "price_per_sqft_max": round(price_per_sqft_max),
                "price_per_sqft_mid": round(price_per_sqft_mid)
            }
        }

    @staticmethod
    def valuate_plot(
        pin_code: str,
        sqft: float,
        road_facing: str = "inner_road",
        corner_plot: bool = False,
        distance_km: float = 2.0
    ) -> Dict:
        """
        Valuate a plot using PIN code-based model

        Args:
            pin_code: 6-digit PIN code
            sqft: Plot size in square feet
            road_facing: "inner_road" or "main_road"
            corner_plot: Whether plot is corner plot
            distance_km: Distance within PIN code area

        Returns:
            Dictionary with valuation estimate and breakdown
        """

        if not validate_pincode(pin_code):
            raise ValueError(f"Invalid PIN code: {pin_code}")

        pin_data = get_pincode_data(pin_code)
        if not pin_data or "plot" not in pin_data.get("properties", {}):
            raise ValueError(f"No plot data for PIN code: {pin_code}")

        plot_data = pin_data["properties"]["plot"]

        # Determine base prices: prefer market prices if available, else use guidance values
        market_multiplier = plot_data.get("marketMultiplier", 1.0)

        if "marketMin" in plot_data and "marketMax" in plot_data:
            # Use actual market prices as base
            base_price_min = plot_data.get("marketMin", 0)
            base_price_max = plot_data.get("marketMax", 0)
        else:
            # Fall back to guidance values with multiplier
            guidance_obj = pin_data.get("guidanceValue", {})
            guidance_min = guidance_obj.get("min", plot_data.get("guidanceMin", plot_data.get("min", 0)))
            guidance_max = guidance_obj.get("max", plot_data.get("guidanceMax", plot_data.get("max", 0)))
            base_price_min = guidance_min * market_multiplier
            base_price_max = guidance_max * market_multiplier

        if not base_price_min or not base_price_max:
            raise ValueError(f"Invalid price values for PIN code {pin_code}. Plot: {plot_data}")

        base_price_mid = (base_price_min + base_price_max) / 2

        # Get adjustments
        adjustments = PropertyAdjustments.plot_adjustments(sqft, road_facing, corner_plot)
        distance_mult = get_intra_pincode_distance_multiplier(distance_km)

        # Calculate price per sqft
        price_per_sqft_min = base_price_min * distance_mult * adjustments["combined"]
        price_per_sqft_max = base_price_max * distance_mult * adjustments["combined"]
        price_per_sqft_mid = base_price_mid * distance_mult * adjustments["combined"]

        # Calculate total value
        estimate_min = round(price_per_sqft_min * sqft)
        estimate_max = round(price_per_sqft_max * sqft)
        estimate_mid = round(price_per_sqft_mid * sqft)

        return {
            "property_type": "plot",
            "pin_code": pin_code,
            "locality": pin_data.get("locality", ""),
            "city": pin_data.get("city", ""),
            "tier": pin_data.get("tier", ""),
            "sqft": sqft,
            "estimate_min": estimate_min,
            "estimate_max": estimate_max,
            "estimate_mid": estimate_mid,
            "price_per_sqft": round(price_per_sqft_mid),
            "confidence": "75-80%",
            "breakdown": {
                "base_price_min": round(base_price_min),
                "base_price_max": round(base_price_max),
                "market_multiplier": round(market_multiplier, 2),
                "distance_km": distance_km,
                "distance_multiplier": round(distance_mult, 2),
                "size_adjustment": round(adjustments["size"], 2),
                "road_adjustment": round(adjustments["road"], 2),
                "corner_adjustment": round(adjustments["corner"], 2),
                "price_per_sqft_min": round(price_per_sqft_min),
                "price_per_sqft_max": round(price_per_sqft_max),
                "price_per_sqft_mid": round(price_per_sqft_mid)
            }
        }

    @staticmethod
    def valuate_villa(
        pin_code: str,
        acres: float,
        amenities: list = None,
        distance_km: float = 2.0
    ) -> Dict:
        """
        Valuate a villa using PIN code-based model

        Args:
            pin_code: 6-digit PIN code
            acres: Villa size in acres
            amenities: List of amenities (pool, gym, gated, private_garden)
            distance_km: Distance within PIN code area

        Returns:
            Dictionary with valuation estimate and breakdown
        """

        if amenities is None:
            amenities = []

        if not validate_pincode(pin_code):
            raise ValueError(f"Invalid PIN code: {pin_code}")

        pin_data = get_pincode_data(pin_code)
        if not pin_data or "villa" not in pin_data.get("properties", {}):
            raise ValueError(f"No villa data for PIN code: {pin_code}")

        villa_data = pin_data["properties"]["villa"]

        # Get guidance value (typically per acre)
        guidance_min = villa_data.get("min", 0)
        guidance_max = villa_data.get("max", 0)

        if not guidance_min or not guidance_max:
            raise ValueError(f"Invalid guidance values for PIN code {pin_code}")

        # Apply market multiplier
        market_multiplier = villa_data.get("marketMultiplier", 1.0)
        base_price_per_acre_min = guidance_min * market_multiplier
        base_price_per_acre_max = guidance_max * market_multiplier
        base_price_per_acre_mid = (base_price_per_acre_min + base_price_per_acre_max) / 2

        # Get adjustments
        adjustments = PropertyAdjustments.villa_adjustments(acres, amenities)
        distance_mult = get_intra_pincode_distance_multiplier(distance_km)

        # Calculate price per acre after multipliers
        price_per_acre_min = base_price_per_acre_min * distance_mult * adjustments["combined"]
        price_per_acre_max = base_price_per_acre_max * distance_mult * adjustments["combined"]
        price_per_acre_mid = base_price_per_acre_mid * distance_mult * adjustments["combined"]

        # Calculate total value
        estimate_min = round(price_per_acre_min * acres)
        estimate_max = round(price_per_acre_max * acres)
        estimate_mid = round(price_per_acre_mid * acres)

        # For reference, calculate price per sqft (1 acre = 43,560 sqft)
        sqft = acres * 43560
        price_per_sqft_mid = estimate_mid / sqft if sqft > 0 else 0

        return {
            "property_type": "villa",
            "pin_code": pin_code,
            "locality": pin_data.get("locality", ""),
            "city": pin_data.get("city", ""),
            "tier": pin_data.get("tier", ""),
            "acres": acres,
            "estimate_min": estimate_min,
            "estimate_max": estimate_max,
            "estimate_mid": estimate_mid,
            "price_per_acre": round(price_per_acre_mid),
            "price_per_sqft": round(price_per_sqft_mid),
            "confidence": "70-75%",
            "breakdown": {
                "guidance_value_min_per_acre": guidance_min,
                "guidance_value_max_per_acre": guidance_max,
                "market_multiplier": round(market_multiplier, 2),
                "distance_km": distance_km,
                "distance_multiplier": round(distance_mult, 2),
                "size_adjustment": round(adjustments["size"], 2),
                "amenities_adjustment": round(adjustments["amenities"], 2),
                "price_per_acre_min": round(price_per_acre_min),
                "price_per_acre_max": round(price_per_acre_max),
                "price_per_acre_mid": round(price_per_acre_mid)
            }
        }

    @staticmethod
    def valuate_agricultural(
        pin_code: str,
        acres: float,
        water_access: str = "garden",
        development_potential: str = "low"
    ) -> Dict:
        """
        Valuate agricultural land using PIN code-based model

        Args:
            pin_code: 6-digit PIN code
            acres: Land size in acres
            water_access: "dry", "garden", or "wet"
            development_potential: "low", "medium", or "high"

        Returns:
            Dictionary with valuation estimate and breakdown
        """

        if not validate_pincode(pin_code):
            raise ValueError(f"Invalid PIN code: {pin_code}")

        pin_data = get_pincode_data(pin_code)
        if not pin_data or "agricultural" not in pin_data.get("properties", {}):
            raise ValueError(f"No agricultural data for PIN code: {pin_code}")

        agri_data = pin_data["properties"]["agricultural"]

        # Get guidance value
        guidance_min = agri_data.get("min", 0)
        guidance_max = agri_data.get("max", 0)

        if not guidance_min or not guidance_max:
            raise ValueError(f"Invalid guidance values for PIN code {pin_code}")

        # Apply market multiplier
        market_multiplier = agri_data.get("marketMultiplier", 1.0)
        base_price_min = guidance_min * market_multiplier
        base_price_max = guidance_max * market_multiplier
        base_price_mid = (base_price_min + base_price_max) / 2

        # Get adjustments
        adjustments = PropertyAdjustments.agricultural_adjustments(acres, water_access, development_potential)

        # Calculate value
        estimate_min = round(base_price_min * adjustments["combined"] * acres)
        estimate_max = round(base_price_max * adjustments["combined"] * acres)
        estimate_mid = round(base_price_mid * adjustments["combined"] * acres)

        return {
            "property_type": "agricultural",
            "pin_code": pin_code,
            "locality": pin_data.get("locality", ""),
            "city": pin_data.get("city", ""),
            "tier": pin_data.get("tier", ""),
            "acres": acres,
            "estimate_min": estimate_min,
            "estimate_max": estimate_max,
            "estimate_mid": estimate_mid,
            "unit": agri_data.get("unit", "₹/acre"),
            "confidence": "65-70%",
            "breakdown": {
                "guidance_value_min": guidance_min,
                "guidance_value_max": guidance_max,
                "market_multiplier": round(market_multiplier, 2),
                "size_adjustment": round(adjustments["size"], 2),
                "water_adjustment": round(adjustments["water"], 2),
                "development_adjustment": round(adjustments["development"], 2)
            }
        }

# ============================================================================
# MAIN / TEST FUNCTIONS
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("PropBot Valuation Engine - PIN Code Model")
    print("=" * 80)

    # Test Case 1: Bangalore Premium (560034 - Koramangala)
    print("\nTest 1: Bangalore Premium - Koramangala (560034)")
    print("Property: 2BHK Apartment, 1100 sqft")
    result = PropertyValuator.valuate_apartment(
        pin_code="560034",
        sqft=1100,
        bedrooms=2,
        distance_km=3
    )
    print(f"Estimate: ₹{result['estimate_mid']:,} ({result['estimate_min']:,} - {result['estimate_max']:,})")
    print(f"Price/sqft: ₹{result['price_per_sqft']:,}")

    # Test Case 2: Mysore Premium (570009 - Saraswathipuram)
    print("\nTest 2: Mysore Premium - Saraswathipuram (570009)")
    print("Property: 2BHK Apartment, 1100 sqft")
    result = PropertyValuator.valuate_apartment(
        pin_code="570009",
        sqft=1100,
        bedrooms=2,
        distance_km=2.5
    )
    print(f"Estimate: ₹{result['estimate_mid']:,} ({result['estimate_min']:,} - {result['estimate_max']:,})")
    print(f"Price/sqft: ₹{result['price_per_sqft']:,}")

    # Test Case 3: Mysore Mid-Range (570025 - Vijayanagar)
    print("\nTest 3: Mysore Mid-Range - Vijayanagar (570025)")
    print("Property: 2BHK Apartment, 1100 sqft")
    result = PropertyValuator.valuate_apartment(
        pin_code="570025",
        sqft=1100,
        bedrooms=2,
        distance_km=3
    )
    print(f"Estimate: ₹{result['estimate_mid']:,} ({result['estimate_min']:,} - {result['estimate_max']:,})")
    print(f"Price/sqft: ₹{result['price_per_sqft']:,}")

    # Test Case 4: Bangalore Plot (560034 - Koramangala)
    print("\nTest 4: Bangalore Premium Plot - Koramangala (560034)")
    print("Property: Plot, 2400 sqft, Corner")
    result = PropertyValuator.valuate_plot(
        pin_code="560034",
        sqft=2400,
        corner_plot=True,
        distance_km=2
    )
    print(f"Estimate: ₹{result['estimate_mid']:,} ({result['estimate_min']:,} - {result['estimate_max']:,})")
    print(f"Price/sqft: ₹{result['price_per_sqft']:,}")

    print("\n" + "=" * 80)
    print("✅ All tests completed successfully!")
    print("=" * 80)
