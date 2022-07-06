from flask import Flask, jsonify, render_template, request
import pandas as pd 
import pickle
import numpy as np
from keras.models import Sequential
from keras.layers import Dense
from keras.layers import LSTM
from keras.layers import Dropout
from keras.callbacks import ModelCheckpoint
from keras.losses import MeanSquaredError
from keras.metrics import RootMeanSquaredError
from keras import metrics
from keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from keras.callbacks import EarlyStopping

stop = EarlyStopping(monitor='root_mean_squared_error', patience=30, mode='min')
#conversion from a single column dataframe to two arrays, one with the observations and one with the label to predict
def df_to_supervised_discharge(df, window_size=12):
    df_as_np = df.to_numpy()
    X = []
    y = []
    for i in range(len(df_as_np)-window_size):
        row = [r for r in df_as_np[i:i+window_size]]
        X.append(row)
        label = df_as_np[i+window_size][0]
        y.append(label)
    return np.array(X), np.array(y)

#conversion from a single column dataframe to two arrays, one with the observations and one with the label to predict
def df_to_supervised_temperature(df, window_size=12):
    df_as_np = df.to_numpy()
    X = []
    y = []
    for i in range(len(df_as_np)-window_size):
        row = [r for r in df_as_np[i:i+window_size]]
        X.append(row)
        label = df_as_np[i+window_size][0]
        y.append(label)
    return np.array(X), np.array(y)

def create_future_df(df, window_size=12):
    last_time = df.index.values[-1]
    df_as_np = df.to_numpy()
    X = []
    i = len(df_as_np)-window_size
    row = [r for r in df_as_np[i:i+window_size]]
    X.append(row)
    return np.array(X), last_time


def append_row_tmp(X, last_time, predicted_val):
    #create the new row basically
    X_new = []
    day = 60*60*24
    year = 365.2425*day
    next_month = pd.Timestamp(last_time) + pd.DateOffset(months=1)
    sin = np.sin(next_month.timestamp()*(2*np.pi/year))
    cos = np.cos(next_month.timestamp()*(2*np.pi/year))
    row = [predicted_val, sin, cos]
    for i in range(1, len(X[0])):
        X_new.append(X[0][i])
    X_new.append(row)
    return np.array([X_new]), next_month

def append_row_dis(X, last_time, predicted_val_tmp, predicted_val_dis):
    #create the new row basically
    X_new = []
    day = 60*60*24
    year = 365.2425*day
    next_month = pd.Timestamp(last_time) + pd.DateOffset(months=1)
    sin = np.sin(next_month.timestamp()*(2*np.pi/year))
    cos = np.cos(next_month.timestamp()*(2*np.pi/year))
    row = [predicted_val_dis, predicted_val_tmp, sin, cos]
    for i in range(1, len(X[0])):
        X_new.append(X[0][i])
    X_new.append(row)
    return np.array([X_new]), next_month

df_pred_grouped = pd.read_pickle('E:/francesco/UNI/HDS/models/grouped_pred.pkl')
df_pred_grouped = df_pred_grouped.set_index(['coords', 'time'])

df_grouped = pd.read_pickle('../../monthly/grouped_all.pkl')
#creating the dataframe for each point
day = 60*60*24
year = 365.2425*day

df_prediction = df_grouped
df_prediction = df_prediction.set_index('time')

df_prediction['secs'] = df_prediction.index.map(pd.Timestamp.timestamp)

df_prediction['year_sin'] = np.sin(df_prediction['secs']*(2*np.pi/year))
df_prediction['year_cos'] = np.cos(df_prediction['secs']*(2*np.pi/year))
df_prediction = df_prediction.reset_index()
df_prediction = df_prediction.set_index(['coords', 'time'])

df_prediction = df_prediction.drop(columns=['secs'])

df_grouped = None

df = {}
year_idx = 2011 #year in the name of the file
for i in range(6, 18): #index in the name of the file
    df[year_idx] =  pd.read_pickle('../../dtp_avg/italy-dtp-avg-'+str(year_idx)+'-'+str(i)+'.pkl')
    df[year_idx] = df[year_idx].set_index(['coords', 'time'])
    year_idx += 1

def getYearData(year, c):
    if year not in df:
        return {}
    try:
        app = df[year].loc[c, :]
    except:
        return {}
    lst = app.index.get_level_values('time')
    months = []
    for e in lst:
        val_y = e.split(' ')[0]
        splitted = val_y.split('-')
        months.append(splitted[2]+'-'+splitted[1]+'-'+splitted[0])
    dis_val = app['discharge'].values
    temp_val = app['temp'].values
    prec_val = app['prec'].values
    avg_dis = app['avg_dis'].values
    avg_temp = app['avg_temp'].values
    avg_prec = app['avg_prec'].values
    obj = {
        'data':{
            'months':months,
            'dis':{
                'values':dis_val.tolist(),
                'avg': avg_dis.tolist(),
            },
            'temp':{
                'values':temp_val.tolist(),
                'avg': avg_temp.tolist(),
            },
            'prec':{
                'values':prec_val.tolist(),
                'avg': avg_prec.tolist(),
            }
        }
    }
    return obj

def get_static_prediction(window, c):
    try:
        app = df_pred_grouped.loc[c, :]
    except:
        return {}
    lst = app.index.get_level_values('time')
    months = []
    for e in range(window):
        months.append(lst[e].strftime("%d-%m-%Y"))
    dis_val = app['dis'].values
    obj = {
        'data':{
            'months':months,
            'pred':dis_val.tolist(),
        }
    }
    return obj


app = Flask(__name__)

def prediction(coord, window):
    try:
        reduced_df = df_prediction.loc[coord, :]
    except:
        return [], []
    #creating the datasets to train the model for the temperature
    X_t, y_t = df_to_supervised_temperature(reduced_df.drop(columns=['prec', 'discharge']))

    #splitting
    n = len(X_t)
    X_train, y_train = X_t[0:int(n*0.7)], y_t[0:int(n*0.7)]
    X_val, y_val = X_t[int(n*0.7):], y_t[int(n*0.7):]
    #it trains better on unscaled data
    model_tmp = Sequential()
    model_tmp.add(LSTM(32, input_shape=(X_train.shape[1], X_train.shape[2])))
    model_tmp.add(Dense(12))
    model_tmp.add(Dense(1))

    model_tmp.compile(loss=MeanSquaredError(), optimizer=Adam(learning_rate=0.1), metrics=[RootMeanSquaredError()])
    model_tmp.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=10000, verbose=0, callbacks=[stop])
    #saving the model inside the directory
        
    #creating the datasets to train the model for the discharge
    X_d, y_d = df_to_supervised_discharge(reduced_df.drop(columns=['prec']))

    #splitting
    n = len(X_d)
    X_train, y_train = X_d[0:int(n*0.7)], y_d[0:int(n*0.7)]
    X_val, y_val = X_d[int(n*0.7):], y_d[int(n*0.7):]

    #normalizing
    X_mean = X_train.mean()
    X_std = X_train.std()
    X_train_sc = (X_train - X_mean) / X_std
    X_val_sc = (X_val - X_mean) / X_std

    y_train_sc = (y_train - X_mean) / X_std
    y_val_sc = (y_val - X_mean) / X_std
    
    model_dis = Sequential()
    model_dis.add(LSTM(32, input_shape=(X_train_sc.shape[1], X_train_sc.shape[2])))
    model_dis.add(Dense(12))
    model_dis.add(Dense(1))

    model_dis.compile(loss=MeanSquaredError(), optimizer=Adam(learning_rate=0.01), metrics=[RootMeanSquaredError()])
    model_dis.fit(X_train_sc, y_train_sc, validation_data=(X_val_sc, y_val_sc), epochs=10000, verbose=0, callbacks=[stop])

    #creating the new dataset from the last value to predict the future
    X_tmp, last_time = create_future_df(reduced_df.drop(columns=['prec', 'discharge']))
    X_dis, _ = create_future_df(reduced_df.drop(columns=['prec']))
    X_dis_sc = (X_dis - X_mean) / X_std
    #structure to save the prediction results
    dis_pred_ls = []
    time = []
    #predicting
    for i in range(window):
        tmp_pred = model_tmp.predict(X_tmp).flatten()[0]
        dis_pred = model_dis.predict(X_dis_sc).flatten()[0]
        dis_pred = (dis_pred*X_std)+X_mean

        dis_pred_ls.append(dis_pred)
        time.append(pd.to_datetime(last_time).strftime("%d-%m-%Y"))

        X_tmp, _ = append_row_tmp(X_tmp, last_time, tmp_pred)
        X_dis, last_time = append_row_dis(X_dis, last_time, tmp_pred, dis_pred)
        X_dis_sc = (X_dis - X_mean) / X_std

    del model_tmp
    del model_dis
    return time, dis_pred_ls

@app.route('/predict_live/<int:months>/<string:coords>', methods=['POST'])
def predict_live(months, coords):
    str_c = coords.split(',')
    c = (float(str_c[1]), float(str_c[0]))
    t, p = prediction(c, months)
    return jsonify({'data': {'months':t, 'pred':p}})

@app.route('/predict/<int:months>/<string:coords>', methods=['POST'])
def predict(months, coords):
    str_c = coords.split(',')
    c = (float(str_c[1]), float(str_c[0]))
    obj = get_static_prediction(months, c)
    return obj

@app.route('/plot', methods=['GET'])
def plot():
    data = {}
    str_c = request.args.get('coords')
    str_c = str_c.split(',')
    c = (float(str_c[1]), float(str_c[0]))
    for year in range(2011, 2023):
        data[year] = getYearData(year, c)
    return jsonify(data)


@app.route("/")
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run()