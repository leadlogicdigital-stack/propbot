#!/usr/bin/env python3
"""
Wrapper script for API to call valuation engine
Usage: python3 valuate.py <json_params>
"""

import sys
import json
from valuation_engine import PropertyValuator

def main():
    try:
        # Get parameters from command line
        params = json.loads(sys.argv[1])

        city = params.get('city', 'mysore')
        property_type = params.get('property_type', 'apartment')
        distance_km = float(params.get('distance_km', 5))
        area_name = params.get('area_name')

        if property_type == 'apartment':
            result = PropertyValuator.valuate_apartment(
                city=city,
                sqft=float(params.get('sqft', 1000)),
                distance_km=distance_km,
                bedrooms=int(params.get('bedrooms', 2)),
                age_years=int(params.get('age_years', 5)),
                furnishing=params.get('furnishing', 'unfurnished'),
                area_name=area_name
            )
        elif property_type == 'plot':
            result = PropertyValuator.valuate_plot(
                city=city,
                sqft=float(params.get('sqft', 2400)),
                distance_km=distance_km,
                road_facing=params.get('road_facing', 'inner_road'),
                corner_plot=params.get('corner_plot', False),
                area_name=area_name
            )
        elif property_type == 'villa':
            result = PropertyValuator.valuate_villa(
                city=city,
                acres=float(params.get('acres', 2)),
                distance_km=distance_km,
                area_name=area_name,
                amenities=params.get('amenities', [])
            )
        elif property_type == 'agricultural':
            result = PropertyValuator.valuate_agricultural(
                city=city,
                acres=float(params.get('acres', 1)),
                distance_km=distance_km,
                area_name=area_name,
                water_access=params.get('water_access', 'garden'),
                development_potential=params.get('development_potential', 'low')
            )
        else:
            result = PropertyValuator.valuate_apartment(
                city=city,
                sqft=float(params.get('sqft', 1000)),
                distance_km=distance_km,
                area_name=area_name
            )

        print(json.dumps(result))

    except Exception as e:
        error_result = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing parameters. Usage: python3 valuate.py <json_params>'}))
        sys.exit(1)
    main()
