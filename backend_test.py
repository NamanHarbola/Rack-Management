#!/usr/bin/env python3
"""
Backend Test Suite for MADAN STORE Rack & Inventory Management System
Tests all API endpoints with comprehensive scenarios
"""

import requests
import json
import time
from typing import Dict, List, Any

# Configuration
BASE_URL = "https://374afd2f-5ee9-4ce8-9228-83f6ad638fdc.preview.emergentagent.com/api"
TIMEOUT = 30

class RackInventoryTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.created_racks = []  # Track created racks for cleanup
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")

    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "MADAN STORE" in data["message"]:
                    self.log_result("Root Endpoint", True, f"Response: {data['message']}")
                else:
                    self.log_result("Root Endpoint", False, f"Unexpected response: {data}")
            else:
                self.log_result("Root Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Root Endpoint", False, f"Exception: {str(e)}")

    def test_create_racks(self):
        """Test POST /api/racks - Create new racks with different floor and item combinations"""
        test_racks = [
            {
                "rackNumber": "R001",
                "floor": "Ground Floor",
                "items": ["Electronics", "Mobile Phones", "Chargers", "Headphones"]
            },
            {
                "rackNumber": "R002", 
                "floor": "Ground Floor",
                "items": ["Cables", "USB Cables", "HDMI Cables", "Power Cables"]
            },
            {
                "rackNumber": "R101",
                "floor": "1st Floor", 
                "items": ["Batteries", "AA Batteries", "AAA Batteries", "Rechargeable Batteries"]
            },
            {
                "rackNumber": "R102",
                "floor": "1st Floor",
                "items": ["Computer Accessories", "Keyboards", "Mouse", "Webcams"]
            },
            {
                "rackNumber": "R201",
                "floor": "2nd Floor",
                "items": ["Storage Devices", "Hard Drives", "USB Drives", "Memory Cards"]
            }
        ]

        for i, rack_data in enumerate(test_racks):
            try:
                response = self.session.post(f"{BASE_URL}/racks", json=rack_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if all(key in data for key in ["id", "rackNumber", "floor", "items"]):
                        self.created_racks.append(data["id"])
                        self.log_result(f"Create Rack {rack_data['rackNumber']}", True, 
                                      f"Created with ID: {data['id']}")
                    else:
                        self.log_result(f"Create Rack {rack_data['rackNumber']}", False, 
                                      f"Missing required fields in response: {data}")
                else:
                    self.log_result(f"Create Rack {rack_data['rackNumber']}", False, 
                                  f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_result(f"Create Rack {rack_data['rackNumber']}", False, f"Exception: {str(e)}")

    def test_get_all_racks(self):
        """Test GET /api/racks - Get all racks grouped by floor"""
        try:
            response = self.session.get(f"{BASE_URL}/racks")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    floors_found = list(data.keys())
                    total_racks = sum(len(racks) for racks in data.values())
                    
                    expected_floors = ["Ground Floor", "1st Floor", "2nd Floor"]
                    floors_match = all(floor in floors_found for floor in expected_floors)
                    
                    if floors_match and total_racks >= 5:
                        self.log_result("Get All Racks", True, 
                                      f"Found {total_racks} racks across floors: {floors_found}")
                    else:
                        self.log_result("Get All Racks", False, 
                                      f"Expected floors not found or insufficient racks. Floors: {floors_found}, Total: {total_racks}")
                else:
                    self.log_result("Get All Racks", False, f"Expected dict response, got: {type(data)}")
            else:
                self.log_result("Get All Racks", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Get All Racks", False, f"Exception: {str(e)}")

    def test_get_specific_rack(self):
        """Test GET /api/racks/{rack_id} - Get specific rack by ID"""
        if not self.created_racks:
            self.log_result("Get Specific Rack", False, "No racks available for testing")
            return

        # Test with valid rack ID
        rack_id = self.created_racks[0]
        try:
            response = self.session.get(f"{BASE_URL}/racks/{rack_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == rack_id:
                    self.log_result("Get Specific Rack (Valid ID)", True, 
                                  f"Retrieved rack: {data.get('rackNumber')} on {data.get('floor')}")
                else:
                    self.log_result("Get Specific Rack (Valid ID)", False, 
                                  f"ID mismatch. Expected: {rack_id}, Got: {data.get('id')}")
            else:
                self.log_result("Get Specific Rack (Valid ID)", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Get Specific Rack (Valid ID)", False, f"Exception: {str(e)}")

        # Test with invalid rack ID
        try:
            invalid_id = "invalid-rack-id-12345"
            response = self.session.get(f"{BASE_URL}/racks/{invalid_id}")
            
            if response.status_code == 404:
                self.log_result("Get Specific Rack (Invalid ID)", True, "Correctly returned 404 for invalid ID")
            else:
                self.log_result("Get Specific Rack (Invalid ID)", False, 
                              f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Get Specific Rack (Invalid ID)", False, f"Exception: {str(e)}")

    def test_update_rack(self):
        """Test PUT /api/racks/{rack_id} - Update rack information"""
        if not self.created_racks:
            self.log_result("Update Rack", False, "No racks available for testing")
            return

        rack_id = self.created_racks[0]
        update_data = {
            "rackNumber": "R001-UPDATED",
            "floor": "Ground Floor",
            "items": ["Electronics", "Mobile Phones", "Chargers", "Headphones", "Tablets"]
        }

        try:
            response = self.session.put(f"{BASE_URL}/racks/{rack_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("rackNumber") == update_data["rackNumber"] and 
                    len(data.get("items", [])) == 5):
                    self.log_result("Update Rack", True, 
                                  f"Successfully updated rack to: {data.get('rackNumber')}")
                else:
                    self.log_result("Update Rack", False, 
                                  f"Update not reflected properly: {data}")
            else:
                self.log_result("Update Rack", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Update Rack", False, f"Exception: {str(e)}")

    def test_search_functionality(self):
        """Test GET /api/racks/search?q={query} - Search functionality"""
        search_tests = [
            {
                "query": "R001",
                "description": "Search by rack number",
                "expected_min_results": 1
            },
            {
                "query": "Ground",
                "description": "Search by floor name",
                "expected_min_results": 2
            },
            {
                "query": "Electronics",
                "description": "Search by item name",
                "expected_min_results": 1
            },
            {
                "query": "Batteries",
                "description": "Search for batteries",
                "expected_min_results": 1
            },
            {
                "query": "nonexistent",
                "description": "Search for non-existent item",
                "expected_min_results": 0
            }
        ]

        for test in search_tests:
            try:
                response = self.session.get(f"{BASE_URL}/racks/search", params={"q": test["query"]})
                
                if response.status_code == 200:
                    data = response.json()
                    if "racks" in data and "matchedItems" in data:
                        racks_count = len(data["racks"])
                        matched_items = data["matchedItems"]
                        
                        if racks_count >= test["expected_min_results"]:
                            self.log_result(f"Search: {test['description']}", True, 
                                          f"Found {racks_count} racks, matched items: {len(matched_items)}")
                        else:
                            self.log_result(f"Search: {test['description']}", False, 
                                          f"Expected >= {test['expected_min_results']}, got {racks_count}")
                    else:
                        self.log_result(f"Search: {test['description']}", False, 
                                      f"Missing required fields in response: {data}")
                else:
                    self.log_result(f"Search: {test['description']}", False, 
                                  f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_result(f"Search: {test['description']}", False, f"Exception: {str(e)}")

    def test_search_edge_cases(self):
        """Test search edge cases"""
        # Test empty search (should fail)
        try:
            response = self.session.get(f"{BASE_URL}/racks/search", params={"q": ""})
            if response.status_code == 422:  # Validation error expected
                self.log_result("Search Edge Case: Empty Query", True, "Correctly rejected empty search")
            else:
                self.log_result("Search Edge Case: Empty Query", False, 
                              f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Search Edge Case: Empty Query", False, f"Exception: {str(e)}")

        # Test special characters
        try:
            response = self.session.get(f"{BASE_URL}/racks/search", params={"q": "R0*1"})
            if response.status_code == 200:
                self.log_result("Search Edge Case: Special Characters", True, "Handled special characters")
            else:
                self.log_result("Search Edge Case: Special Characters", False, 
                              f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Search Edge Case: Special Characters", False, f"Exception: {str(e)}")

    def test_delete_rack(self):
        """Test DELETE /api/racks/{rack_id} - Delete rack"""
        if not self.created_racks:
            self.log_result("Delete Rack", False, "No racks available for testing")
            return

        # Test deleting the last created rack
        rack_id = self.created_racks[-1]
        try:
            response = self.session.delete(f"{BASE_URL}/racks/{rack_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "deleted" in data["message"].lower():
                    self.created_racks.remove(rack_id)
                    self.log_result("Delete Rack (Valid ID)", True, f"Successfully deleted rack: {rack_id}")
                else:
                    self.log_result("Delete Rack (Valid ID)", False, f"Unexpected response: {data}")
            else:
                self.log_result("Delete Rack (Valid ID)", False, 
                              f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Delete Rack (Valid ID)", False, f"Exception: {str(e)}")

        # Test deleting non-existent rack
        try:
            invalid_id = "non-existent-rack-id"
            response = self.session.delete(f"{BASE_URL}/racks/{invalid_id}")
            
            if response.status_code == 404:
                self.log_result("Delete Rack (Invalid ID)", True, "Correctly returned 404 for invalid ID")
            else:
                self.log_result("Delete Rack (Invalid ID)", False, 
                              f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Delete Rack (Invalid ID)", False, f"Exception: {str(e)}")

    def cleanup_remaining_racks(self):
        """Clean up any remaining test racks"""
        print("\n🧹 Cleaning up remaining test racks...")
        for rack_id in self.created_racks[:]:
            try:
                response = self.session.delete(f"{BASE_URL}/racks/{rack_id}")
                if response.status_code == 200:
                    print(f"   Cleaned up rack: {rack_id}")
                    self.created_racks.remove(rack_id)
            except Exception as e:
                print(f"   Failed to cleanup rack {rack_id}: {e}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting MADAN STORE Backend API Tests")
        print("=" * 60)
        
        # Test sequence
        self.test_root_endpoint()
        print()
        
        self.test_create_racks()
        print()
        
        self.test_get_all_racks()
        print()
        
        self.test_get_specific_rack()
        print()
        
        self.test_update_rack()
        print()
        
        self.test_search_functionality()
        print()
        
        self.test_search_edge_cases()
        print()
        
        self.test_delete_rack()
        print()
        
        # Cleanup
        self.cleanup_remaining_racks()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        print(f"📈 Success Rate: {(self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed']) * 100):.1f}%")
        
        if self.test_results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        return self.test_results['failed'] == 0

if __name__ == "__main__":
    tester = RackInventoryTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend is working correctly.")
        exit(0)
    else:
        print(f"\n💥 {tester.test_results['failed']} test(s) failed. Check the errors above.")
        exit(1)