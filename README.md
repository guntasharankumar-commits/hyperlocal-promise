
Quick Commerce use-case

Problem Statement [focused on fulfilment]: When a customer is on a Q-comm platform, the customer would like to know promise time before even considering placing an order. Promise time plays a critical role in ensuring order conversion (short times increases order conversion) and at the same time reliability of the platform meeting promise time ensures customer satisfaction and drives repeat rate 

Objective: Build a ‘Dynamic promise & fulfillment’ Agent who will maximise the customer life time value on the Q-Comm platform

Assumptions for V1: 
Homogeneous Customer persona: Values convenience: speed > experience > Cost
Heterogeneous Delivery person persona with different historical order data & ratings
Delivery person and Vehicle are coupled hence all Delivery person have same Veh Speed
1 Dark store with a pre-defined serviceable area.
Market benchmarking on other platform: 10 min delivery acting as anchor point for customers
Dark store has all assortments [No OOS use-cases]
There are enough delivery people at each dark store to deliver shipment.. 
Picking and packing time is same for all Orders
Avg. Picking time is 2 min with coefficient of variation 0.4 [higher variance vs packing] 
Avg. packing time is 1 min with coefficient of variation 0.2 [lower variance vs picking] 
Weather conditions and time of the days constraints are being discounted



Mathematical formulation  

Context: Customer Life time value in e-commerce (& Q-Comm) is dependent on both Customer conversion & repeat rate. While CLTV is the objective function, it is derived from creating trust on the platform for each order. Hence, taking a proxy metric “Trust Equity Score”

Trust Equity Score  = W1 * (Anchor - Promise)3 + W2 * (Promise - Planned)  + W3 * (Delivery boy rating - 4)  - LM Cost 
Anchor time = 10 min [defined in assumptions]
Last Mile cost = function ( rate / hour, KMs, cost / KM)
Promise: Promised time to the customer and can only be in count of minutes (Ex: 9 minutes)
Planned = Avg. Picking time + Avg. Packing time + planned delivery time based on predicted route & driver + alpha * sqrt (picking variance + packing variance + historical delivery variance)
Delivery person if delivered in nearby place have less mean & variance due to locality awareness
W1, W2, W3 are weights for each section. They could be adjusted based on past TES of the customer
TES low → W2 weight will increase prioritising reliability 
TES already high → W1 weight will increase to drive conversion opportunity 

High level Solution Approach

Goal: Maximize CLTV (using Trust Equity Score (TES) as proxy metric) by optimising order conversion (speed) and user retention (reliability).
O2D [Promise time] = O2S [Picking & Packing time] + S2D [Delivery time]
O2S: Time taken for the store to process the order and handover the order to rider
S2D: Travel time from store to customer location which is dependent on Route taken (KMs & Speed) and rider familiarity to the delivery location
Promise & Assignment Agent Workflow: Predict high-confidence promise ETA & assign riders on confirmed orders 
Direct Inputs: Customer/Store Geo-coordinates (Lat-Long), Order Metadata.
Augmented Context:
Platform list of acceptable promise ETA on the platform
Customer Tiering: Past TES and customer persona → impacts weights in TES objective function 
Rider locality awareness : Historical performance in the Store - Hex 
Operational Health: Real-time average & Variation of dark-store's picking & packing on floor.
Agent Process: The Agent optimises TES using a multi-variable polynomial objective function. Promise Agent calculates multiple TES scores for each combination of promise x rider x route. Assignment Agent assigns the rider for confirmed orders blocking availability of the rider for next order until the order is delivered and rider reports back at store
Output: A rider having best TES is assigned for every confirmed order and subsequent promise is shared to Promise cache at Store-Hex level
Recovering Agent Workflow: if an order is delayed at dark store due to delayed processing, Identify opportunities to minimise the negative impact to TES 
Trigger: Triggered when Actual O2S > Planned O2S + σ
Inputs: Order ID, committed Promise, actual elapsed O2S time, and customer's historical TES.
Process: The Recovering agent connects to Promise Agent to re-identify the best alternatives to minimise TES loss and later use Assignment Agent to re-assign rider / route wherever needed
Output: Revised Assignment (New Rider/Route) or communication on revised ETAs to Customer


Future enhancements [V2 and more] :
The serviceable area of Dark store could be dynamically defined based on Promise Engine optimising for TES. Constant changes in serviceability to User experience could have a negative impact and it could complicated to bring it to the objective function in V1
De-coupling Vehicle & Driver 
Handling of use-cases where there is no infinite supply of delivery agents. Hence, promise time is dependent on the delivery person being available ( if a delivery person is assigned an order, they being available back at the store to be accounted) 
Picking & Packing time could be dynamic and dependent on the items in the basket [fast moving / slow moving, Add. packing needed Ex: Ice-cream, ]
Change in delivery promises due to weather & time of the day
Optimisation Opportunity: Batching multiple Orders in similar locality to reduce Last Mile cost but might have a negative impact of timely delivery
W1, W2, W3 will be dependent on customer persona, acquisition budget for new customers, re-activation budget for long inactive customers, etc.


Architecture Decisions

Use-case: There could be multiple customer locations which are nearby and the Promise is likely to remain same in nearby locations
  Decision: Serviceable area is broken into multiple hexagons where S2D from Store - Hex with deviation within a min
Use-case: Promise → Storefront: Customer would be able to see 02D SLA at different pages in the storefront
  Reduce repetitive calls to Promise Agent while customer is just browsing & too far from order confirmation 
  Decision: Customer serviceable area is divided into multiple zones [hexagons]: Promise is calculated between [Store x Customer Hex] and stored in Cache
  Decision: Cache is updated periodically at certain & when there is change in delivery person availability
  Decision: Promise SLAs are identified in sync when a user visits the check-out page and when a new order is placed. The cache for the store-Hex is updated when a new data-point is calculated.
Use-case: Maintain rider availability on real-time to promise is reliable
  Decision: Riders are blocked only when an order is mapped to the rider. Upon delivery completion and rider return to store, rider availability is re-instated
Use-case: Promise to be committed must capture real-time operational nuances to the TES model.
  Decision: A dedicated augmentation Module pulls
    Internal: Dark Store "Health" (order Queue and processing SLAs) and Rider ratings.
    External: Google Maps feasible routes (with different TAT, KMs, Speed)


Figma Link: https://www.figma.com/board/8d4Zaefk9B16OLrO8F2ATn/Agents?node-id=6-1608&t=6Njhwe8evIWv4rzW-4 





