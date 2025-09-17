/**
 * Recommendation Controller
 * Handles AI-powered juice recommendations based on symptoms and health goals
 */

const { supabase } = require('../db/supabase');

/**
 * Get juice recommendations based on symptoms and allergies
 */
const getRecommendations = async (req, res) => {
    try {
        const { symptoms, allergies = [] } = req.body;

        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one symptom is required'
            });
        }

        // Get symptom-ingredient mappings
        const { data: symptomMappings, error: symptomError } = await supabase
            .from('symptoms_ingredients')
            .select('*')
            .in('symptom', symptoms.map(s => s.toLowerCase()));

        if (symptomError) {
            console.error('Get symptom mappings error:', symptomError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch symptom mappings'
            });
        }

        // Collect recommended and avoided ingredients
        const recommendedIngredients = new Set();
        const avoidIngredients = new Set();

        symptomMappings.forEach(mapping => {
            // Add recommended ingredients
            if (mapping.recommended_ingredients) {
                mapping.recommended_ingredients.forEach(ingredient => {
                    recommendedIngredients.add(ingredient.toLowerCase());
                });
            }

            // Add ingredients to avoid
            if (mapping.avoid_ingredients) {
                mapping.avoid_ingredients.forEach(ingredient => {
                    avoidIngredients.add(ingredient.toLowerCase());
                });
            }
        });

        // Add user allergies to avoid list
        allergies.forEach(allergy => {
            avoidIngredients.add(allergy.toLowerCase());
        });

        // Get all available products
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true);

        if (productsError) {
            console.error('Get products error:', productsError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }

        // Score products based on ingredient matching
        const scoredProducts = products.map(product => {
            let score = 0;
            let matchedIngredients = [];
            let hasAvoidedIngredients = false;

            if (product.ingredients && Array.isArray(product.ingredients)) {
                product.ingredients.forEach(ingredient => {
                    const lowerIngredient = ingredient.toLowerCase();
                    
                    // Check if ingredient should be avoided
                    if (avoidIngredients.has(lowerIngredient)) {
                        hasAvoidedIngredients = true;
                        score -= 10; // Heavy penalty for avoided ingredients
                    }
                    
                    // Check if ingredient is recommended
                    if (recommendedIngredients.has(lowerIngredient)) {
                        score += 5;
                        matchedIngredients.push(ingredient);
                    }
                });
            }

            // Bonus points for health benefits matching symptoms
            if (product.health_benefits && Array.isArray(product.health_benefits)) {
                product.health_benefits.forEach(benefit => {
                    const lowerBenefit = benefit.toLowerCase();
                    symptoms.forEach(symptom => {
                        if (lowerBenefit.includes(symptom.toLowerCase()) || 
                            symptom.toLowerCase().includes(lowerBenefit)) {
                            score += 3;
                        }
                    });
                });
            }

            return {
                ...product,
                recommendation_score: score,
                matched_ingredients: matchedIngredients,
                has_avoided_ingredients: hasAvoidedIngredients,
                recommendation_reasons: generateRecommendationReasons(
                    matchedIngredients, 
                    product.health_benefits || [], 
                    symptoms
                )
            };
        });

        // Filter out products with avoided ingredients and sort by score
        const filteredProducts = scoredProducts
            .filter(product => !product.has_avoided_ingredients && product.recommendation_score > 0)
            .sort((a, b) => b.recommendation_score - a.recommendation_score)
            .slice(0, 3); // Top 3 recommendations

        // If no products match, provide general recommendations
        if (filteredProducts.length === 0) {
            const generalRecommendations = products
                .filter(product => {
                    // Ensure no avoided ingredients
                    if (product.ingredients && Array.isArray(product.ingredients)) {
                        return !product.ingredients.some(ingredient => 
                            avoidIngredients.has(ingredient.toLowerCase())
                        );
                    }
                    return true;
                })
                .sort(() => Math.random() - 0.5) // Random selection
                .slice(0, 3)
                .map(product => ({
                    ...product,
                    recommendation_score: 1,
                    matched_ingredients: [],
                    has_avoided_ingredients: false,
                    recommendation_reasons: ['General wellness support', 'No conflicting ingredients']
                }));

            return res.json({
                success: true,
                message: 'No specific matches found. Here are some general recommendations.',
                data: {
                    recommendations: generalRecommendations,
                    symptoms_analyzed: symptoms,
                    allergies_considered: allergies,
                    total_products_analyzed: products.length
                }
            });
        }

        res.json({
            success: true,
            message: 'Recommendations generated successfully',
            data: {
                recommendations: filteredProducts,
                symptoms_analyzed: symptoms,
                allergies_considered: allergies,
                total_products_analyzed: products.length,
                symptom_mappings_found: symptomMappings.length
            }
        });

    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Generate human-readable recommendation reasons
 */
const generateRecommendationReasons = (matchedIngredients, healthBenefits, symptoms) => {
    const reasons = [];

    if (matchedIngredients.length > 0) {
        reasons.push(`Contains beneficial ingredients: ${matchedIngredients.join(', ')}`);
    }

    if (healthBenefits.length > 0) {
        const relevantBenefits = healthBenefits.filter(benefit => 
            symptoms.some(symptom => 
                benefit.toLowerCase().includes(symptom.toLowerCase()) ||
                symptom.toLowerCase().includes(benefit.toLowerCase())
            )
        );
        
        if (relevantBenefits.length > 0) {
            reasons.push(`Supports: ${relevantBenefits.join(', ')}`);
        }
    }

    if (reasons.length === 0) {
        reasons.push('Nutritious and refreshing choice');
    }

    return reasons;
};

/**
 * Get available symptoms for recommendations
 */
const getAvailableSymptoms = async (req, res) => {
    try {
        const { data: symptoms, error } = await supabase
            .from('symptoms_ingredients')
            .select('symptom, description')
            .order('symptom');

        if (error) {
            console.error('Get available symptoms error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch available symptoms'
            });
        }

        res.json({
            success: true,
            data: symptoms
        });

    } catch (error) {
        console.error('Get available symptoms error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get health benefits for all products
 */
const getHealthBenefits = async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('health_benefits')
            .eq('is_available', true);

        if (error) {
            console.error('Get health benefits error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch health benefits'
            });
        }

        // Collect all unique health benefits
        const allBenefits = new Set();
        products.forEach(product => {
            if (product.health_benefits && Array.isArray(product.health_benefits)) {
                product.health_benefits.forEach(benefit => {
                    allBenefits.add(benefit);
                });
            }
        });

        const uniqueBenefits = Array.from(allBenefits).sort();

        res.json({
            success: true,
            data: uniqueBenefits
        });

    } catch (error) {
        console.error('Get health benefits error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getRecommendations,
    getAvailableSymptoms,
    getHealthBenefits
};