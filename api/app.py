import os
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import psycopg2
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

DB_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    if not DB_URL:
        # Fallback for local testing if no DB_URL is set
        return None
    return psycopg2.connect(DB_URL)

@app.route('/api/recommend/hybrid', methods=['POST'])
def hybrid_recommendations():
    data = request.json
    user_id = data.get('userId')
    limit = data.get('limit', 18)

    conn = get_db_connection()
    if not conn:
        # Return fallback dummy recommendations if DB is not connected
        return jsonify({
            "recommendations": [
                {"id": 157336, "score": 0.95, "reason": "Recommended based on your love for Sci-Fi and Mind-bending plots."},
                {"id": 27205, "score": 0.90, "reason": "Highly rated by users with similar taste to yours."},
                {"id": 155, "score": 0.85, "reason": "Because you selected Action and Dark moods."}
            ]
        })

    try:
        # 1. Fetch user preferences
        prefs_query = "SELECT * FROM \"UserPreference\" WHERE \"userId\" = %s"
        prefs_df = pd.read_sql(prefs_query, conn, params=(user_id,))
        
        # 2. Fetch movies dataset
        movies_query = "SELECT \"tmdbId\", title, overview, \"genresJson\" FROM \"CachedMovie\""
        movies_df = pd.read_sql(movies_query, conn)
        
        # 3. Fetch user ratings (for collaborative filtering)
        ratings_query = "SELECT * FROM \"Rating\""
        ratings_df = pd.read_sql(ratings_query, conn)
        
        if prefs_df.empty or movies_df.empty:
            return jsonify({"recommendations": []})

        # --- Content-Based Scoring ---
        user_genres = " ".join(prefs_df.iloc[0]['genres'])
        user_moods = " ".join(prefs_df.iloc[0]['moodSlugs'])
        user_profile_text = f"{user_genres} {user_moods}"
        
        # Simple extraction of genres from JSON for the text
        movies_df['genre_text'] = movies_df['genresJson'].apply(lambda x: " ".join([g.get('name', '') for g in x]) if isinstance(x, list) else "")
        movies_df['content_text'] = movies_df['genre_text'] + " " + movies_df['overview'].fillna("")
        
        tfidf = TfidfVectorizer(stop_words='english')
        tfidf_matrix = tfidf.fit_transform(movies_df['content_text'])
        user_vec = tfidf.transform([user_profile_text])
        
        content_sim = cosine_similarity(user_vec, tfidf_matrix).flatten()
        movies_df['content_score'] = content_sim

        # --- Collaborative Filtering (Simple User-Based) ---
        user_ratings = ratings_df[ratings_df['userId'] == user_id]
        
        # If the user has rated movies, find similar users
        if not user_ratings.empty:
            # Create user-item matrix
            user_item_matrix = ratings_df.pivot_table(index='userId', columns='movieTmdbId', values='value').fillna(0)
            
            if user_id in user_item_matrix.index:
                user_vector = user_item_matrix.loc[user_id].values.reshape(1, -1)
                user_similarities = cosine_similarity(user_vector, user_item_matrix).flatten()
                
                # Weight ratings by user similarity
                sim_users = pd.DataFrame({
                    'userId': user_item_matrix.index,
                    'sim': user_similarities
                }).sort_values(by='sim', ascending=False)[1:] # Exclude self
                
                # Predict scores for unrated movies
                predictions = []
                for movie_id in user_item_matrix.columns:
                    if movie_id not in user_ratings['movieTmdbId'].values:
                        movie_ratings = ratings_df[ratings_df['movieTmdbId'] == movie_id]
                        if not movie_ratings.empty:
                            merged = pd.merge(movie_ratings, sim_users, on='userId')
                            if merged['sim'].sum() > 0:
                                pred = (merged['value'] * merged['sim']).sum() / merged['sim'].sum()
                                predictions.append({'tmdbId': movie_id, 'cf_score': pred / 5.0}) # Normalize to 0-1
                
                cf_df = pd.DataFrame(predictions)
                if not cf_df.empty:
                    movies_df = pd.merge(movies_df, cf_df, on='tmdbId', how='left').fillna({'cf_score': 0})
                else:
                    movies_df['cf_score'] = 0
            else:
                movies_df['cf_score'] = 0
        else:
            movies_df['cf_score'] = 0

        # --- Hybrid Scoring ---
        # Weight CF higher if user has more ratings
        alpha = min(0.8, len(user_ratings) / 10.0) if not user_ratings.empty else 0.0
        
        movies_df['final_score'] = (1 - alpha) * movies_df['content_score'] + alpha * movies_df['cf_score']
        
        # Filter out already rated movies
        rated_ids = user_ratings['movieTmdbId'].tolist() if not user_ratings.empty else []
        recommendations = movies_df[~movies_df['tmdbId'].isin(rated_ids)]
        
        recommendations = recommendations.sort_values(by='final_score', ascending=False).head(limit)
        
        result = []
        for _, row in recommendations.iterrows():
            if row['final_score'] > 0:
                reason = "Based on your onboarding preferences."
                if alpha > 0.4 and row['cf_score'] > row['content_score']:
                    reason = "Highly recommended by users with similar watch history."
                elif row['content_score'] > 0.6:
                    reason = f"Because you enjoy {user_genres}."
                    
                result.append({
                    "id": int(row['tmdbId']),
                    "score": float(row['final_score']),
                    "reason": reason
                })

        return jsonify({"recommendations": result})
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
